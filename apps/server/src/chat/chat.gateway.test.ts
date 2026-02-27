import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../auth/token-blacklist.service';
import { ChatGateway } from './chat.gateway';
import type { Message, SendMessageInput } from '@chat/shared';
import { serverToClientEventSchemas } from '@chat/shared';
import { PresenceService } from './presence.service';
import { ReadReceiptsService } from '../read-receipts/read-receipts.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CONVERSATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLIENT_MESSAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MESSAGE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createChatServiceMock(): {
  isUserParticipant: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  assertMessageRateLimit: ReturnType<typeof vi.fn>;
} {
  return {
    isUserParticipant: vi.fn(),
    sendMessage: vi.fn(),
    assertMessageRateLimit: vi.fn(),
  };
}

function createPresenceServiceMock(): {
  refreshHeartbeat: ReturnType<typeof vi.fn>;
  scheduleOffline: ReturnType<typeof vi.fn>;
} {
  return {
    refreshHeartbeat: vi.fn(),
    scheduleOffline: vi.fn(),
  };
}

function createReadReceiptsServiceMock(): {
  markAsRead: ReturnType<typeof vi.fn>;
  getReceiptsForMessage: ReturnType<typeof vi.fn>;
} {
  return {
    markAsRead: vi.fn(),
    getReceiptsForMessage: vi.fn(),
  };
}

function createClientMock(token = 'token'): {
  handshake: { query: { token: string } };
  data: Record<string, unknown>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  __roomEmit: ReturnType<typeof vi.fn>;
} {
  const roomEmit = vi.fn();
  return {
    handshake: { query: { token } },
    data: {} as Record<string, unknown>,
    emit: vi.fn(),
    disconnect: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: roomEmit }),
    __roomEmit: roomEmit,
  };
}

describe('ChatGateway', () => {
  let jwtService: Pick<JwtService, 'verifyAsync'>;
  let configService: Pick<ConfigService, 'get'>;
  let tokenBlacklistService: Pick<TokenBlacklistService, 'isBlacklisted'>;
  let chatService: ReturnType<typeof createChatServiceMock>;
  let presenceService: ReturnType<typeof createPresenceServiceMock>;
  let readReceiptsService: ReturnType<typeof createReadReceiptsServiceMock>;
  let gateway: ChatGateway;
  let roomEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('secret'),
    };
    tokenBlacklistService = {
      isBlacklisted: vi.fn().mockReturnValue(false),
    };
    chatService = createChatServiceMock();
    presenceService = createPresenceServiceMock();
    readReceiptsService = createReadReceiptsServiceMock();
    gateway = new ChatGateway(
      jwtService as JwtService,
      configService as ConfigService,
      tokenBlacklistService as TokenBlacklistService,
      chatService as never,
      presenceService as unknown as PresenceService,
      readReceiptsService as unknown as ReadReceiptsService,
    );
    roomEmit = vi.fn();
    gateway.server = {
      to: vi.fn().mockReturnValue({ emit: roomEmit }),
      emit: vi.fn(),
    } as never;
  });

  it('authenticates socket connection and emits auth:success', async () => {
    (jwtService.verifyAsync as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: USER_ID, jti: 'jti-1' });
    const client = createClientMock();

    await gateway.handleConnection(client as never);

    expect(client.data.userId).toBe(USER_ID);
    expect(client.emit).toHaveBeenCalledWith('auth:success', { userId: USER_ID });
  });

  it('emits auth:error and disconnects when token is invalid', async () => {
    (jwtService.verifyAsync as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('invalid token'));
    const client = createClientMock();

    await gateway.handleConnection(client as never);

    expect(client.emit).toHaveBeenCalledWith('auth:error', {
      error: 'Unauthorized',
      code: 'AUTH_FAILED',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('joins conversation room after subscribe validation', async () => {
    chatService.isUserParticipant.mockResolvedValue(true);
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleSubscribe(client as never, { conversationId: CONVERSATION_ID });

    expect(client.join).toHaveBeenCalledWith(`conversation:${CONVERSATION_ID}`);
    expect(client.emit).toHaveBeenCalledWith('subscribed', { conversationId: CONVERSATION_ID });
  });

  it('leaves conversation room and emits unsubscribed event', async () => {
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleUnsubscribe(client as never, { conversationId: CONVERSATION_ID });

    expect(client.leave).toHaveBeenCalledWith(`conversation:${CONVERSATION_ID}`);
    expect(client.emit).toHaveBeenCalledWith('unsubscribed', { conversationId: CONVERSATION_ID });
  });

  it('emits validation error for invalid message payload', async () => {
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleMessageSend(client as never, { conversationId: 'not-a-uuid' });

    expect(client.emit).toHaveBeenCalledWith('message:error', {
      clientMessageId: expect.any(String),
      message: 'Invalid payload',
      code: 'VALIDATION_ERROR',
      retryable: false,
      context: expect.objectContaining({
        event: 'message:send',
      }),
    });
  });

  it('emits message:sent and broadcasts message:received on success', async () => {
    const message: Message = {
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
      status: 'delivered',
      replyToId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };
    const payload: SendMessageInput = {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    };
    chatService.sendMessage.mockResolvedValue(message);
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleMessageSend(client as never, payload);

    expect(client.emit).toHaveBeenCalledWith('message:sent', {
      clientMessageId: CLIENT_MESSAGE_ID,
      messageId: MESSAGE_ID,
      status: 'delivered',
      timestamp: message.createdAt,
      conversationId: CONVERSATION_ID,
    });
    expect(roomEmit).toHaveBeenCalledWith('message:received', { message });
  });

  it('broadcasts presence:update from presence heartbeat', async () => {
    const client = createClientMock();
    client.data.userId = USER_ID;
    const serverEmit = vi.fn();
    gateway.server = {
      to: vi.fn().mockReturnValue({ emit: roomEmit }),
      emit: serverEmit,
    } as never;

    await gateway.handlePresenceHeartbeat(client as never, { status: 'online' });

    expect(presenceService.refreshHeartbeat).toHaveBeenCalledWith(USER_ID, 'online');
    expect(serverEmit).toHaveBeenCalledWith('presence:update', {
      userId: USER_ID,
      status: 'online',
    });
  });

  it('broadcasts typing started and stopped to room peers', async () => {
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleTypingStart(client as never, { conversationId: CONVERSATION_ID });
    await gateway.handleTypingStop(client as never, { conversationId: CONVERSATION_ID });

    expect(client.to).toHaveBeenCalledWith(`conversation:${CONVERSATION_ID}`);
    expect(client.__roomEmit).toHaveBeenNthCalledWith(1, 'typing:started', {
      conversationId: CONVERSATION_ID,
      userId: USER_ID,
    });
    expect(client.__roomEmit).toHaveBeenNthCalledWith(2, 'typing:stopped', {
      conversationId: CONVERSATION_ID,
      userId: USER_ID,
    });
  });

  it('emits server->client payloads that parse with shared schemas', async () => {
    const message: Message = {
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
      status: 'delivered',
      replyToId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };
    chatService.sendMessage.mockResolvedValue(message);
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleMessageSend(client as never, {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    });

    const sentCall = client.emit.mock.calls.find((call) => call[0] === 'message:sent');
    const receivedCall = roomEmit.mock.calls.find((call) => call[0] === 'message:received');

    expect(sentCall).toBeDefined();
    expect(receivedCall).toBeDefined();

    const sentPayload = sentCall?.[1];
    const receivedPayload = receivedCall?.[1];

    expect(serverToClientEventSchemas['message:sent'].safeParse(sentPayload).success).toBe(true);
    expect(serverToClientEventSchemas['message:received'].safeParse(receivedPayload).success).toBe(true);
  });

  it('emits RATE_LIMITED code when chat service rejects due to rate limit', async () => {
    chatService.assertMessageRateLimit.mockRejectedValue(
      new HttpException(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many messages. Please retry later.',
            retryAfterMs: 30_000,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleMessageSend(client as never, {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    });

    expect(client.emit).toHaveBeenCalledWith(
      'message:error',
      expect.objectContaining({
        clientMessageId: CLIENT_MESSAGE_ID,
        message: expect.any(String),
        code: 'RATE_LIMITED',
        retryable: true,
        retryAfter: expect.any(Number),
      }),
    );
  });

  it('emits offline presence update after disconnect grace callback', () => {
    const client = createClientMock();
    client.data.userId = USER_ID;
    const serverEmit = vi.fn();
    gateway.server = {
      to: vi.fn().mockReturnValue({ emit: roomEmit }),
      emit: serverEmit,
    } as never;
    presenceService.scheduleOffline.mockImplementation((_userId, onOffline) => {
      onOffline();
    });

    gateway.handleDisconnect(client as never);

    expect(presenceService.scheduleOffline).toHaveBeenCalledWith(USER_ID, expect.any(Function));
    expect(serverEmit).toHaveBeenCalledWith('presence:update', {
      userId: USER_ID,
      status: 'offline',
    });
  });
});
