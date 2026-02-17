import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../auth/token-blacklist.service';
import { ChatGateway } from './chat.gateway';
import type { Message, SendMessageInput } from '@chat/shared';
import { serverToClientEventSchemas } from '@chat/shared';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CONVERSATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLIENT_MESSAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MESSAGE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createChatServiceMock() {
  return {
    isUserParticipant: vi.fn(),
    sendMessage: vi.fn(),
    assertMessageRateLimit: vi.fn(),
  };
}

function createClientMock(token = 'token') {
  return {
    handshake: { query: { token } },
    data: {} as Record<string, unknown>,
    emit: vi.fn(),
    disconnect: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  };
}

describe('ChatGateway', () => {
  let jwtService: Pick<JwtService, 'verifyAsync'>;
  let configService: Pick<ConfigService, 'get'>;
  let tokenBlacklistService: Pick<TokenBlacklistService, 'isBlacklisted'>;
  let chatService: ReturnType<typeof createChatServiceMock>;
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
    gateway = new ChatGateway(
      jwtService as JwtService,
      configService as ConfigService,
      tokenBlacklistService as TokenBlacklistService,
      chatService as never,
    );
    roomEmit = vi.fn();
    gateway.server = {
      to: vi.fn().mockReturnValue({ emit: roomEmit }),
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

  it('emits validation error for invalid message payload', async () => {
    const client = createClientMock();
    client.data.userId = USER_ID;

    await gateway.handleMessageSend(client as never, { conversationId: 'not-a-uuid' });

    expect(client.emit).toHaveBeenCalledWith('message:error', {
      clientMessageId: expect.any(String),
      error: 'Invalid payload',
      code: 'VALIDATION_ERROR',
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

    expect(serverEmit).toHaveBeenCalledWith('presence:update', {
      userId: USER_ID,
      status: 'online',
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

    expect(client.emit).toHaveBeenCalledWith('message:error', {
      clientMessageId: CLIENT_MESSAGE_ID,
      error: expect.any(String),
      code: 'RATE_LIMITED',
    });
  });
});
