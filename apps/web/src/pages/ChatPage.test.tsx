import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@chat/shared/schemas/message';
import { ChatPage } from './ChatPage';

const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId = '11111111-1111-4111-8111-111111111111';

const existingMessage: Message = {
  id: '123e4567-e89b-42d3-a456-426614174010',
  conversationId,
  senderId: userId,
  content: 'existing message',
  contentType: 'text',
  clientMessageId: null,
  status: 'delivered',
  replyToId: null,
  createdAt: '2026-02-23T10:00:00.000Z',
  updatedAt: '2026-02-23T10:00:00.000Z',
  deletedAt: null,
};

const optimisticMessage: Message = {
  id: '123e4567-e89b-42d3-a456-426614174011',
  conversationId,
  senderId: userId,
  content: 'optimistic message',
  contentType: 'text',
  clientMessageId: '123e4567-e89b-42d3-a456-426614174012',
  status: 'sending',
  replyToId: null,
  createdAt: '2026-02-23T10:00:01.000Z',
  updatedAt: '2026-02-23T10:00:01.000Z',
  deletedAt: null,
};

const messageListSpy = vi.fn();
let capturedSocketOptions: Record<string, unknown> | undefined;

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: userId, username: 'alice', displayName: 'Alice' },
  }),
}));

vi.mock('@/hooks/useConversations', () => ({
  useConversations: () => ({
    data: {
      pages: [{
        conversations: [{
          id: conversationId,
          title: 'Test Chat',
          participants: [{ user: { id: userId, username: 'alice', displayName: 'Alice' } }],
        }],
      }],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ status: 'connected', isConnected: true }),
}));

vi.mock('@/hooks/useChatSocket', () => ({
  useChatSocket: (options: Record<string, unknown>) => {
    capturedSocketOptions = options;
    return {
      messages: [],
      typingUserIds: [],
      sendMessage: vi.fn(),
      sendTypingStart: vi.fn(),
      sendTypingStop: vi.fn(),
    };
  },
}));

vi.mock('@/hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({ onInputActivity: vi.fn() }),
}));

vi.mock('@/hooks/useUsersSearch', () => ({
  useUsersSearch: () => ({ data: { users: [] }, isLoading: false }),
}));

vi.mock('@/components/chat/ChatLayout', () => ({
  ChatLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/chat/Sidebar', () => ({
  Sidebar: () => <div>sidebar</div>,
}));

vi.mock('@/components/chat/ChatHeader', () => ({
  ChatHeader: () => <div>header</div>,
}));

vi.mock('@/components/chat/MessageList', () => ({
  MessageList: (props: Record<string, unknown>) => {
    messageListSpy(props);
    const messages = (props.messages as Message[]) ?? [];
    return <div data-testid="message-list">{messages.map((message) => message.content).join('|')}</div>;
  },
}));

vi.mock('@/components/chat/MessageInput', () => ({
  MessageInput: () => <div>input</div>,
}));

vi.mock('@/components/chat/CreateChatModal', () => ({
  CreateChatModal: () => null,
}));

vi.mock('@/components/chat/TypingIndicator', () => ({
  TypingIndicator: () => null,
}));

vi.mock('@/components/chat/ConnectionStatus', () => ({
  ConnectionStatus: () => null,
}));

vi.mock('@/lib/api', () => ({
  conversationsApi: {
    listMessages: vi.fn(async () => ({ messages: [existingMessage] })),
    create: vi.fn(),
    leave: vi.fn(),
    delete: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));

describe('ChatPage', () => {
  beforeEach(() => {
    messageListSpy.mockClear();
    capturedSocketOptions = undefined;
  });

  it('shows optimistic message immediately even when REST history exists', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/?chat=${conversationId}`]}>
          <ChatPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const latestProps = messageListSpy.mock.calls.at(-1)?.[0] as { messages: Message[] } | undefined;
      expect(latestProps?.messages.map((message) => message.content)).toContain('existing message');
    });

    const onOptimisticMessage = capturedSocketOptions?.onOptimisticMessage as
      | ((message: Message) => void)
      | undefined;

    expect(onOptimisticMessage).toBeTypeOf('function');

    onOptimisticMessage?.(optimisticMessage);

    await waitFor(() => {
      const latestProps = messageListSpy.mock.calls.at(-1)?.[0] as { messages: Message[] } | undefined;
      expect(latestProps?.messages.map((message) => message.content)).toEqual([
        'existing message',
        'optimistic message',
      ]);
    });
  });
});
