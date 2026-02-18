import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  conversationCreatedSchema,
  conversationDetailSchema,
  conversationsListResponseSchema,
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

describe('ConversationsService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: ConversationsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new ConversationsService(repository as never);
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
});
