import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SendMessageInput } from '@chat/shared';
import { messageSchema } from '@chat/shared';
import { ChatService } from './chat.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CONVERSATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLIENT_MESSAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MESSAGE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createMessagesRepositoryMock(): {
  findByClientMessageId: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
} {
  return {
    findByClientMessageId: vi.fn(),
    create: vi.fn(),
  };
}

function createConversationsRepositoryMock(): {
  isUserParticipant: ReturnType<typeof vi.fn>;
} {
  return {
    isUserParticipant: vi.fn(),
  };
}

describe('ChatService', () => {
  let messagesRepository: ReturnType<typeof createMessagesRepositoryMock>;
  let conversationsRepository: ReturnType<typeof createConversationsRepositoryMock>;
  let configService: Pick<ConfigService, 'get'>;
  let service: ChatService;

  beforeEach(() => {
    messagesRepository = createMessagesRepositoryMock();
    conversationsRepository = createConversationsRepositoryMock();
    configService = {
      get: vi.fn().mockReturnValue(undefined),
    };
    service = new ChatService(
      messagesRepository as never,
      conversationsRepository as never,
      configService as ConfigService,
    );
  });

  it('rejects message send when user is not a participant', async () => {
    conversationsRepository.isUserParticipant.mockResolvedValue(false);

    const input: SendMessageInput = {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    };

    await expect(service.sendMessage(USER_ID, input)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns existing message when clientMessageId already exists', async () => {
    conversationsRepository.isUserParticipant.mockResolvedValue(true);
    messagesRepository.findByClientMessageId.mockResolvedValue({
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
      status: 'delivered',
      replyToId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const input: SendMessageInput = {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    };

    const result = await service.sendMessage(USER_ID, input);
    expect(messageSchema.parse(result)).toEqual(result);
    expect(messagesRepository.create).not.toHaveBeenCalled();
  });

  it('creates and returns schema-valid message', async () => {
    conversationsRepository.isUserParticipant.mockResolvedValue(true);
    messagesRepository.findByClientMessageId.mockResolvedValue(null);
    messagesRepository.create.mockResolvedValue({
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
      status: 'delivered',
      replyToId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const input: SendMessageInput = {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    };

    const result = await service.sendMessage(USER_ID, input);
    expect(messageSchema.parse(result)).toEqual(result);
    expect(messagesRepository.create).toHaveBeenCalledWith({
      ...input,
      senderId: USER_ID,
    });
  });

  it('enforces 30 messages per minute rate limit', async () => {
    conversationsRepository.isUserParticipant.mockResolvedValue(true);
    messagesRepository.findByClientMessageId.mockResolvedValue(null);
    messagesRepository.create.mockResolvedValue({
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
      status: 'delivered',
      replyToId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    for (let i = 0; i < 30; i += 1) {
      await service.assertMessageRateLimit(USER_ID);
    }

    await expect(service.assertMessageRateLimit(USER_ID)).rejects.toMatchObject({
      response: {
        error: {
          code: 'RATE_LIMITED',
        },
      },
    });
  });

  it('rejects in-flight duplicate clientMessageId when record is not visible yet', async () => {
    conversationsRepository.isUserParticipant.mockResolvedValue(true);
    messagesRepository.findByClientMessageId.mockResolvedValue(null);
    messagesRepository.create.mockResolvedValue({
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
      status: 'delivered',
      replyToId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const input: SendMessageInput = {
      conversationId: CONVERSATION_ID,
      content: 'hello',
      contentType: 'text',
      clientMessageId: CLIENT_MESSAGE_ID,
    };

    await service.sendMessage(USER_ID, input);

    await expect(service.sendMessage(USER_ID, input)).rejects.toMatchObject({
      response: {
        error: {
          code: 'DB_ERROR',
        },
      },
    });
  });
});
