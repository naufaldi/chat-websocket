import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatSocket } from './useChatSocket';
import type { ChatSocketService, SocketConnectionStatus } from '@/lib/socket';

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
});
