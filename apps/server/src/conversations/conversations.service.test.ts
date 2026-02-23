import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  conversationCreatedSchema,
  conversationDetailSchema,
  conversationsListResponseSchema,
  messagesListResponseSchema,
} from '@chat/shared';
import { ConversationsService } from './conversations.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const CONVERSATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createRepositoryMock() {
  return {
    findByUserPaginated: vi.fn(),
    findParticipants: vi.fn(),
    getLastMessage: vi.fn(),
    getParticipantCount: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    isUserParticipant: vi.fn(),
    softDelete: vi.fn(),
    joinConversation: vi.fn(),
    leaveConversation: vi.fn(),
  };
}

function createMessagesRepositoryMock() {
  return {
    findByConversation: vi.fn(),
    findByClientMessageId: vi.fn(),
    create: vi.fn(),
  };
}

function createUsersRepositoryMock() {
  return {
    findById: vi.fn(),
  };
}

function createDbMock() {
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
}

describe('ConversationsService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let messagesRepository: ReturnType<typeof createMessagesRepositoryMock>;
  let usersRepository: ReturnType<typeof createUsersRepositoryMock>;
  let db: ReturnType<typeof createDbMock>;
  let service: ConversationsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    messagesRepository = createMessagesRepositoryMock();
    usersRepository = createUsersRepositoryMock();
    db = createDbMock();
    service = new ConversationsService(
      repository as never,
      messagesRepository as never,
      usersRepository as never,
      db as never,
    );
  });

  it('returns flat paginated list response matching shared schema', async () => {
    repository.findByUserPaginated.mockResolvedValue({
      conversations: [
        {
          id: CONVERSATION_ID,
          type: 'direct',
          title: null,
          avatarUrl: null,
          createdBy: USER_ID,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        },
      ],
      nextCursor: 'cursor-1',
    });
    repository.findParticipants.mockResolvedValue([
      {
        userId: USER_ID,
        username: 'owner',
        displayName: 'Owner',
        avatarUrl: null,
        lastSeenAt: null,
        role: 'owner',
      },
    ]);
    repository.getLastMessage.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      content: 'hello',
      senderId: USER_ID,
      createdAt: new Date('2026-01-01T00:01:00.000Z'),
    });
    repository.getParticipantCount.mockResolvedValue(1);

    const result = await service.findAllByUser(USER_ID, undefined, 20);
    expect(result).toMatchObject(conversationsListResponseSchema.parse(result));
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('cursor-1');
  });

  it('returns created conversation matching shared schema', async () => {
    repository.create.mockResolvedValue({
      id: CONVERSATION_ID,
      type: 'group',
      title: 'Team Chat',
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.findParticipants.mockResolvedValue([
      {
        userId: USER_ID,
        username: 'owner',
        displayName: 'Owner',
        avatarUrl: null,
        lastSeenAt: null,
        role: 'owner',
      },
      {
        userId: OTHER_USER_ID,
        username: 'member',
        displayName: 'Member',
        avatarUrl: null,
        lastSeenAt: null,
        role: 'member',
      },
    ]);

    const result = await service.create(
      { type: 'group', title: 'Team Chat', participantIds: [OTHER_USER_ID] },
      USER_ID
    );
    expect(conversationCreatedSchema.parse(result)).toEqual(result);
  });

  it('returns conversation details matching shared schema', async () => {
    repository.findById.mockResolvedValue({
      id: CONVERSATION_ID,
      type: 'direct',
      title: null,
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.isUserParticipant.mockResolvedValue(true);
    repository.findParticipants.mockResolvedValue([
      {
        userId: USER_ID,
        username: 'owner',
        displayName: 'Owner',
        avatarUrl: null,
        role: 'owner',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        userId: OTHER_USER_ID,
        username: 'member',
        displayName: 'Member',
        avatarUrl: null,
        role: 'member',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastSeenAt: null,
      },
    ]);

    const result = await service.findById(CONVERSATION_ID, USER_ID);
    expect(conversationDetailSchema.parse(result)).toEqual(result);
  });

  it('enforces owner-only delete and owner-cannot-leave constraints', async () => {
    repository.findById.mockResolvedValue({
      id: CONVERSATION_ID,
      type: 'group',
      title: 'Group',
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.delete(CONVERSATION_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(ForbiddenException);

    repository.isUserParticipant.mockResolvedValue(true);
    await expect(service.leave(CONVERSATION_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('supports join/leave for non-owner participants', async () => {
    repository.findById.mockResolvedValue({
      id: CONVERSATION_ID,
      type: 'group',
      title: 'Group',
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.isUserParticipant.mockResolvedValue(false);

    const joinResult = await service.join(CONVERSATION_ID, OTHER_USER_ID);
    expect(joinResult).toEqual({ message: 'Joined conversation successfully' });
    expect(repository.joinConversation).toHaveBeenCalledWith(CONVERSATION_ID, OTHER_USER_ID);

    repository.isUserParticipant.mockResolvedValue(true);
    const leaveResult = await service.leave(CONVERSATION_ID, OTHER_USER_ID);
    expect(leaveResult).toEqual({ message: 'Left conversation successfully' });
    expect(repository.leaveConversation).toHaveBeenCalledWith(CONVERSATION_ID, OTHER_USER_ID);
  });

  it('throws not found for missing or soft-deleted conversation', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findById(CONVERSATION_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('excludes soft-deleted conversations from list (repository filters by isNull deletedAt)', async () => {
    repository.findByUserPaginated.mockResolvedValue({
      conversations: [],
      nextCursor: null,
    });

    const result = await service.findAllByUser(USER_ID, undefined, 20);
    expect(result.conversations).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('returns schema-valid message history for conversation participants', async () => {
    repository.findById.mockResolvedValue({
      id: CONVERSATION_ID,
      type: 'direct',
      title: null,
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    repository.isUserParticipant.mockResolvedValue(true);
    messagesRepository.findByConversation.mockResolvedValue([
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        content: 'newer message',
        contentType: 'text',
        clientMessageId: null,
        status: 'delivered',
        replyToId: null,
        createdAt: new Date('2026-01-01T00:02:00.000Z'),
        updatedAt: new Date('2026-01-01T00:02:00.000Z'),
        deletedAt: null,
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        conversationId: CONVERSATION_ID,
        senderId: OTHER_USER_ID,
        content: 'older message',
        contentType: 'text',
        clientMessageId: null,
        status: 'delivered',
        replyToId: null,
        createdAt: new Date('2026-01-01T00:01:00.000Z'),
        updatedAt: new Date('2026-01-01T00:01:00.000Z'),
        deletedAt: null,
      },
    ]);

    const result = await service.listMessages(CONVERSATION_ID, USER_ID, 50);

    expect(messagesListResponseSchema.parse(result)).toEqual(result);
    expect(result.messages[0]?.content).toBe('older message');
    expect(result.messages[1]?.content).toBe('newer message');
  });

  describe('sendMessageHttp', () => {
    const CLIENT_MESSAGE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    it('should create message and return response with sender info', async () => {
      repository.findById.mockResolvedValue({
        id: CONVERSATION_ID,
        type: 'direct',
        title: null,
        avatarUrl: null,
        createdBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.isUserParticipant.mockResolvedValue(true);
      messagesRepository.findByClientMessageId.mockResolvedValue(null);
      messagesRepository.create.mockResolvedValue({
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        content: 'Hello world',
        contentType: 'text',
        clientMessageId: CLIENT_MESSAGE_ID,
        status: 'delivered',
        replyToId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      });
      usersRepository.findById.mockResolvedValue({
        id: USER_ID,
        email: 'test@test.com',
        username: 'testuser',
        passwordHash: 'hash',
        displayName: 'Test User',
        avatarUrl: null,
        isActive: true,
        lastSeenAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.sendMessageHttp(CONVERSATION_ID, USER_ID, {
        content: 'Hello world',
        contentType: 'text',
        clientMessageId: CLIENT_MESSAGE_ID,
      });

      expect(result.existing).toBe(false);
      expect(result.message.id).toBe('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
      expect(result.message.content).toBe('Hello world');
      expect(result.message.sender.id).toBe(USER_ID);
      expect(result.message.sender.username).toBe('testuser');
      expect(result.message.sender.displayName).toBe('Test User');
    });

    it('should return existing message for duplicate clientMessageId', async () => {
      repository.findById.mockResolvedValue({
        id: CONVERSATION_ID,
        type: 'direct',
        title: null,
        avatarUrl: null,
        createdBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.isUserParticipant.mockResolvedValue(true);
      messagesRepository.findByClientMessageId.mockResolvedValue({
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        content: 'Existing message',
        contentType: 'text',
        clientMessageId: CLIENT_MESSAGE_ID,
        status: 'delivered',
        replyToId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      });
      usersRepository.findById.mockResolvedValue({
        id: USER_ID,
        email: 'test@test.com',
        username: 'testuser',
        passwordHash: 'hash',
        displayName: 'Test User',
        avatarUrl: null,
        isActive: true,
        lastSeenAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.sendMessageHttp(CONVERSATION_ID, USER_ID, {
        content: 'Hello world',
        contentType: 'text',
        clientMessageId: CLIENT_MESSAGE_ID,
      });

      expect(result.existing).toBe(true);
      expect(result.message.id).toBe('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
      expect(result.message.content).toBe('Existing message');
      expect(messagesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw 403 for non-participant', async () => {
      repository.findById.mockResolvedValue({
        id: CONVERSATION_ID,
        type: 'direct',
        title: null,
        avatarUrl: null,
        createdBy: USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.isUserParticipant.mockResolvedValue(false);

      await expect(
        service.sendMessageHttp(CONVERSATION_ID, OTHER_USER_ID, {
          content: 'Hello world',
          contentType: 'text',
          clientMessageId: CLIENT_MESSAGE_ID,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.sendMessageHttp(CONVERSATION_ID, USER_ID, {
          content: 'Hello world',
          contentType: 'text',
          clientMessageId: CLIENT_MESSAGE_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
