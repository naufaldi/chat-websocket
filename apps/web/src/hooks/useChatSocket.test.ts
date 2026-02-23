import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@chat/shared/schemas/message';
import type { ChatSocketService } from '@/lib/socket';
import { useChatSocket } from './useChatSocket';

const UUIDS = {
  conversation: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sender: '11111111-1111-4111-8111-111111111111',
  message: '123e4567-e89b-42d3-a456-426614174001',
  clientMessageId: '123e4567-e89b-42d3-a456-426614174000',
};

const mockListMessages = vi.fn();

vi.mock('@/lib/api', () => ({
  conversationsApi: {
    listMessages: (...args: unknown[]) => mockListMessages(...args),
  },
}));

function createMockService() {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();

  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    sendMessage: vi.fn(),
    typingStart: vi.fn(),
    typingStop: vi.fn(),
    onConnectionStatusChange: vi.fn(() => () => undefined),
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)?.add(handler);
      return () => {
        handlers.get(event)?.delete(handler);
      };
    }),
    getStatus: vi.fn(() => 'connected'),
    trigger: (event: string, payload: unknown) => {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };
}

const baseMessage: Message = {
  id: UUIDS.message,
  conversationId: UUIDS.conversation,
  senderId: UUIDS.sender,
  content: 'hello',
  contentType: 'text',
  clientMessageId: UUIDS.clientMessageId,
  status: 'delivered',
  replyToId: null,
  createdAt: '2026-02-23T10:00:00.000Z',
  updatedAt: '2026-02-23T10:00:00.000Z',
  deletedAt: null,
};

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMessages.mockResolvedValue({ messages: [] });
  });

  it('emits onOptimisticMessage and delegates send to service', async () => {
    const service = createMockService();
    const onOptimisticMessage = vi.fn();

    const { result } = renderHook(() =>
      useChatSocket({
        conversationId: UUIDS.conversation,
        currentUserId: UUIDS.sender,
        enabled: true,
        service: service as unknown as ChatSocketService,
        onOptimisticMessage,
      }),
    );

    await waitFor(() => {
      expect(service.subscribe).toHaveBeenCalledWith(UUIDS.conversation);
    });

    act(() => {
      result.current.sendMessage('hello world');
    });

    expect(onOptimisticMessage).toHaveBeenCalledTimes(1);
    expect(onOptimisticMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: UUIDS.conversation,
        content: 'hello world',
        senderId: UUIDS.sender,
        status: 'sending',
      }),
    );
    expect(service.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: UUIDS.conversation,
        content: 'hello world',
      }),
    );
  });

  it('emits message callbacks for received/sent/error events', async () => {
    const service = createMockService();
    const onMessageReceived = vi.fn();
    const onMessageSent = vi.fn();
    const onMessageError = vi.fn();

    renderHook(() =>
      useChatSocket({
        conversationId: UUIDS.conversation,
        currentUserId: UUIDS.sender,
        enabled: true,
        service: service as unknown as ChatSocketService,
        onMessageReceived,
        onMessageSent,
        onMessageError,
      }),
    );

    await waitFor(() => {
      expect(service.on).toHaveBeenCalled();
    });

    act(() => {
      service.trigger('message:received', { message: baseMessage });
      service.trigger('message:sent', {
        clientMessageId: UUIDS.clientMessageId,
        messageId: UUIDS.message,
        status: 'delivered',
        timestamp: '2026-02-23T10:00:01.000Z',
        conversationId: UUIDS.conversation,
      });
      service.trigger('message:error', {
        clientMessageId: UUIDS.clientMessageId,
        code: 'VALIDATION_ERROR',
        message: 'bad',
        retryable: false,
      });
    });

    expect(onMessageReceived).toHaveBeenCalledWith(baseMessage);
    expect(onMessageSent).toHaveBeenCalledWith({
      clientMessageId: UUIDS.clientMessageId,
      messageId: UUIDS.message,
      timestamp: '2026-02-23T10:00:01.000Z',
      conversationId: UUIDS.conversation,
    });
    expect(onMessageError).toHaveBeenCalledWith({
      clientMessageId: UUIDS.clientMessageId,
    });
  });
});
