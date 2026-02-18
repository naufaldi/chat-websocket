import { describe, expect, it, vi } from 'vitest';
import { serverToClientEventSchemas } from '@chat/shared/schemas/socket';
import { createChatSocketService } from './socket';

type EventHandler = (payload?: unknown) => void;

function createMockSocket() {
  const handlers = new Map<string, Set<EventHandler>>();
  const socket = {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)?.add(handler);
    }),
    off: vi.fn((event: string, handler?: EventHandler) => {
      if (!handler) {
        handlers.delete(event);
        return;
      }
      handlers.get(event)?.delete(handler);
    }),
    trigger(event: string, payload?: unknown) {
      if (event === 'connect') socket.connected = true;
      if (event === 'disconnect') socket.connected = false;
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };
  return socket;
}

describe('ChatSocketService', () => {
  it('emits validated subscribe payload', () => {
    const socket = createMockSocket();
    const service = createChatSocketService({
      createSocket: () => socket,
      getToken: () => 'token',
    });

    service.connect();
    service.subscribe('11111111-1111-4111-8111-111111111111');

    expect(socket.emit).toHaveBeenCalledWith('subscribe', {
      conversationId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('throws on invalid message payload', () => {
    const socket = createMockSocket();
    const service = createChatSocketService({
      createSocket: () => socket,
      getToken: () => 'token',
    });

    service.connect();

    expect(() =>
      service.sendMessage({
        conversationId: '11111111-1111-4111-8111-111111111111',
        content: '',
        clientMessageId: '22222222-2222-4222-8222-222222222222',
      })
    ).toThrow('Invalid payload for "message:send"');
  });

  it('parses inbound events with shared schema', () => {
    const socket = createMockSocket();
    const service = createChatSocketService({
      createSocket: () => socket,
      getToken: () => 'token',
    });
    const onMessageReceived = vi.fn();

    service.connect();
    service.on('message:received', onMessageReceived);

    socket.trigger('message:received', {
      message: {
        id: '33333333-3333-4333-8333-333333333333',
        conversationId: '11111111-1111-4111-8111-111111111111',
        senderId: '44444444-4444-4444-8444-444444444444',
        content: 'hello',
        contentType: 'text',
        clientMessageId: '22222222-2222-4222-8222-222222222222',
        status: 'delivered',
        replyToId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      },
    });

    socket.trigger('message:received', { bad: true });

    expect(onMessageReceived).toHaveBeenCalledTimes(1);
  });

  it('accepts backend message:sent payload shape with shared schema contract', () => {
    const socket = createMockSocket();
    const service = createChatSocketService({
      createSocket: () => socket,
      getToken: () => 'token',
    });
    const onMessageSent = vi.fn();

    service.connect();
    service.on('message:sent', onMessageSent);

    const backendPayload = {
      clientMessageId: '22222222-2222-4222-8222-222222222222',
      messageId: '33333333-3333-4333-8333-333333333333',
      status: 'delivered',
      timestamp: '2026-01-01T00:00:00.000Z',
      conversationId: '11111111-1111-4111-8111-111111111111',
    };

    expect(serverToClientEventSchemas['message:sent'].safeParse(backendPayload).success).toBe(true);
    socket.trigger('message:sent', backendPayload);

    expect(onMessageSent).toHaveBeenCalledWith(backendPayload);
  });

  it('accepts backend message:error payload with retry metadata', () => {
    const socket = createMockSocket();
    const service = createChatSocketService({
      createSocket: () => socket,
      getToken: () => 'token',
    });
    const onMessageError = vi.fn();

    service.connect();
    service.on('message:error', onMessageError);

    const backendPayload = {
      clientMessageId: '22222222-2222-4222-8222-222222222222',
      code: 'RATE_LIMITED',
      message: 'Too many messages. Please retry later.',
      retryable: true,
      retryAfter: 30,
    };

    expect(serverToClientEventSchemas['message:error'].safeParse(backendPayload).success).toBe(true);
    socket.trigger('message:error', backendPayload);

    expect(onMessageError).toHaveBeenCalledWith(backendPayload);
  });

  describe('presence:heartbeat', () => {
    it('emits presence:heartbeat every 15s while connected', () => {
      vi.useFakeTimers();
      const socket = createMockSocket();
      const service = createChatSocketService({
        createSocket: () => socket,
        getToken: () => 'token',
      });

      service.connect();
      socket.trigger('connect');

      expect(socket.emit).not.toHaveBeenCalledWith('presence:heartbeat', expect.anything());

      vi.advanceTimersByTime(15_000);
      expect(socket.emit).toHaveBeenCalledTimes(1);
      expect(socket.emit).toHaveBeenCalledWith('presence:heartbeat', { status: 'online' });

      vi.advanceTimersByTime(15_000);
      expect(socket.emit).toHaveBeenCalledTimes(2);
      expect(socket.emit).toHaveBeenNthCalledWith(2, 'presence:heartbeat', { status: 'online' });

      vi.advanceTimersByTime(15_000);
      expect(socket.emit).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('stops heartbeat on disconnect', () => {
      vi.useFakeTimers();
      const socket = createMockSocket();
      const service = createChatSocketService({
        createSocket: () => socket,
        getToken: () => 'token',
      });

      service.connect();
      socket.trigger('connect');

      vi.advanceTimersByTime(15_000);
      expect(socket.emit).toHaveBeenCalledWith('presence:heartbeat', { status: 'online' });

      service.disconnect();
      const emitCountAfterDisconnect = socket.emit.mock.calls.length;

      vi.advanceTimersByTime(30_000);
      expect(socket.emit.mock.calls.length).toBe(emitCountAfterDisconnect);
    });

    it('does not create duplicate intervals on reconnect', () => {
      vi.useFakeTimers();
      const socket = createMockSocket();
      const service = createChatSocketService({
        createSocket: () => socket,
        getToken: () => 'token',
      });

      service.connect();
      socket.trigger('connect');

      vi.advanceTimersByTime(15_000);
      expect(socket.emit).toHaveBeenCalledTimes(1);

      socket.trigger('disconnect');
      socket.trigger('connect');

      vi.advanceTimersByTime(15_000);
      expect(socket.emit).toHaveBeenCalledTimes(2);
    });
  });
});
