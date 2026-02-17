import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSocket } from './useSocket';
import type { ChatSocketService, SocketConnectionStatus } from '@/lib/socket';

function createServiceMock() {
  const statusListeners = new Set<(status: SocketConnectionStatus) => void>();

  return {
    getStatus: vi.fn(() => 'disconnected' as const),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onConnectionStatusChange: vi.fn((listener: (status: SocketConnectionStatus) => void) => {
      statusListeners.add(listener);
      listener('disconnected');
      return () => {
        statusListeners.delete(listener);
      };
    }),
    emitStatus(status: SocketConnectionStatus) {
      statusListeners.forEach((listener) => listener(status));
    },
  };
}

describe('useSocket', () => {
  it('connects when token exists and disconnects on unmount', () => {
    const service = createServiceMock();
    const { unmount } = renderHook(() =>
      useSocket({
        token: 'token',
        service: service as unknown as ChatSocketService,
      })
    );

    expect(service.connect).toHaveBeenCalledWith('token');
    unmount();
    expect(service.disconnect).toHaveBeenCalled();
  });

  it('updates connection status from service listener', () => {
    const service = createServiceMock();
    const { result } = renderHook(() =>
      useSocket({
        token: 'token',
        service: service as unknown as ChatSocketService,
      })
    );

    act(() => {
      service.emitStatus('reconnecting');
    });
    expect(result.current.status).toBe('reconnecting');
  });
});
