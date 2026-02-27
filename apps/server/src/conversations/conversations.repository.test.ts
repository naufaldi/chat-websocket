import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConversationsRepository } from './conversations.repository';
import { conversationParticipants } from '@chat/db';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CONV_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

interface ChainableMock {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
}

function createChainableMock<T>(resolveValue: T): ChainableMock {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolveValue),
  };
  return {
    select: vi.fn().mockReturnValue(chain),
    ...chain,
  };
}

describe('ConversationsRepository', () => {
  let mockDb: ReturnType<typeof createChainableMock<unknown[]>>;

  beforeEach(() => {
    mockDb = createChainableMock([]);
  });

  it('findById returns null when conversation is soft-deleted (excluded by isNull filter)', async () => {
    mockDb.limit.mockResolvedValue([]);

    const repo = new ConversationsRepository(mockDb as never);
    const result = await repo.findById(CONV_ID);

    expect(result).toBeNull();
    expect(mockDb.where).toHaveBeenCalled();
    const whereArg = mockDb.where.mock.calls[0][0];
    expect(whereArg).toBeDefined();
  });

  it('findById returns conversation when active (deletedAt is null)', async () => {
    const activeConv = {
      id: CONV_ID,
      type: 'direct' as const,
      title: null,
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.limit.mockResolvedValue([activeConv]);

    const repo = new ConversationsRepository(mockDb as never);
    const result = await repo.findById(CONV_ID);

    expect(result).toEqual(activeConv);
  });

  it('findByUser returns empty when user has only soft-deleted conversations', async () => {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: unknown) => {
        if (table === conversationParticipants) {
          return {
            where: vi.fn().mockResolvedValue([{ conversationId: CONV_ID }]),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }),
    }));

    const repo = new ConversationsRepository(mockDb as never);
    const result = await repo.findByUser(USER_ID);

    expect(result).toEqual([]);
  });

  it('findByUserPaginated returns empty when user has only soft-deleted conversations', async () => {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: unknown) => {
        if (table === conversationParticipants) {
          return {
            where: vi.fn().mockResolvedValue([{ conversationId: CONV_ID }]),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }),
    }));

    const repo = new ConversationsRepository(mockDb as never);
    const result = await repo.findByUserPaginated(USER_ID, undefined, 20);

    expect(result.conversations).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it('findByUserPaginated with cursor excludes soft-deleted (baseWhere includes isNull)', async () => {
    const activeConv = {
      id: CONV_ID,
      type: 'direct' as const,
      title: null,
      avatarUrl: null,
      createdBy: USER_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-01-02T00:00:00.000Z', id: CONV_ID })
    ).toString('base64url');

    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: unknown) => {
        if (table === conversationParticipants) {
          return {
            where: vi.fn().mockResolvedValue([{ conversationId: CONV_ID }]),
          };
        }
        const whereChain = {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([activeConv]),
            }),
          }),
        };
        return whereChain;
      }),
    }));

    const repo = new ConversationsRepository(mockDb as never);
    const result = await repo.findByUserPaginated(USER_ID, cursor, 20);

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].id).toBe(CONV_ID);
  });
});
