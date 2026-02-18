import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatSocket } from './useChatSocket';
import type { ChatSocketService, SocketConnectionStatus } from '@/lib/socket';
import { conversationsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  conversationsApi: {
    listMessages: vi.fn().mockResolvedValue({ messages: [] }),
  },
}));

function createServiceMock() {
  const statusListeners = new Set<(status: SocketConnectionStatus) => void>();

  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    sendMessage: vi.fn(),
    typingStart: vi.fn(),
    typingStop: vi.fn(),
    on: vi.fn(() => () => undefined),
    onConnectionStatusChange: vi.fn((listener: (status: SocketConnectionStatus) => void) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    }),
    emitStatus(status: SocketConnectionStatus) {
      statusListeners.forEach((listener) => listener(status));
    },
  };
}

describe('useChatSocket', () => {
  it('resubscribes and triggers recovery callback after reconnect', () => {
    const service = createServiceMock();
    const onReconnectSync = vi.fn();

    renderHook(() =>
      useChatSocket({
        conversationId: '11111111-1111-4111-8111-111111111111',
        enabled: true,
        onReconnectSync,
        service: service as unknown as ChatSocketService,
      })
    );

    expect(service.subscribe).toHaveBeenCalledTimes(1);

    service.emitStatus('reconnecting');
    service.emitStatus('connected');

    expect(service.subscribe).toHaveBeenCalledTimes(2);
    expect(onReconnectSync).toHaveBeenCalledWith({
      conversationId: '11111111-1111-4111-8111-111111111111',
      disconnectedAt: expect.any(String),
    });
  });

  it('unsubscribes active conversation on unmount', () => {
    const service = createServiceMock();
    const { unmount } = renderHook(() =>
      useChatSocket({
        conversationId: '11111111-1111-4111-8111-111111111111',
        enabled: true,
        service: service as unknown as ChatSocketService,
      })
    );

    unmount();

    expect(service.unsubscribe).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('hydrates initial message history when conversation is selected', async () => {
    vi.mocked(conversationsApi.listMessages).mockResolvedValueOnce({
      messages: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
          conversationId: '11111111-1111-4111-8111-111111111111',
          senderId: '22222222-2222-4222-8222-222222222222',
          content: 'seeded message',
          contentType: 'text',
          clientMessageId: null,
          status: 'delivered',
          replyToId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    });

    const service = createServiceMock();
    const { result } = renderHook(() =>
      useChatSocket({
        conversationId: '11111111-1111-4111-8111-111111111111',
        enabled: true,
        service: service as unknown as ChatSocketService,
      })
    );

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]?.content).toBe('seeded message');
  });

  it('merges websocket messages with preloaded history without duplicates', async () => {
    type MessageReceivedPayload = {
      message: {
        id: string;
        conversationId: string;
        senderId: string;
        content: string;
        contentType: 'text';
        clientMessageId: string | null;
        status: 'delivered';
        replyToId: string | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
      };
    };

    const listeners = new Map<string, (payload: unknown) => void>();
    const service = {
      ...createServiceMock(),
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        listeners.set(event, handler);
        return () => {
          listeners.delete(event);
        };
      }),
    };

    vi.mocked(conversationsApi.listMessages).mockResolvedValueOnce({
      messages: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
          conversationId: '11111111-1111-4111-8111-111111111111',
          senderId: '22222222-2222-4222-8222-222222222222',
          content: 'history',
          contentType: 'text',
          clientMessageId: null,
          status: 'delivered',
          replyToId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    });

    const { result } = renderHook(() =>
      useChatSocket({
        conversationId: '11111111-1111-4111-8111-111111111111',
        enabled: true,
        service: service as unknown as ChatSocketService,
      })
    );

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    const onMessageReceived = listeners.get('message:received') as ((payload: MessageReceivedPayload) => void) | undefined;
    expect(onMessageReceived).toBeDefined();

    act(() => {
      onMessageReceived?.({
        message: {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
          conversationId: '11111111-1111-4111-8111-111111111111',
          senderId: '11111111-1111-4111-8111-111111111111',
          content: 'new realtime',
          contentType: 'text',
          clientMessageId: null,
          status: 'delivered',
          replyToId: null,
          createdAt: '2026-01-01T00:01:00.000Z',
          updatedAt: '2026-01-01T00:01:00.000Z',
          deletedAt: null,
        },
      });
      onMessageReceived?.({
        message: {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
          conversationId: '11111111-1111-4111-8111-111111111111',
          senderId: '22222222-2222-4222-8222-222222222222',
          content: 'history',
          contentType: 'text',
          clientMessageId: null,
          status: 'delivered',
          replyToId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      });
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.content).toBe('history');
    expect(result.current.messages[1]?.content).toBe('new realtime');
  });
});
