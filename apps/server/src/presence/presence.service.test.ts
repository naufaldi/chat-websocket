import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenceService } from './presence.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const REQUESTER_ID = '22222222-2222-4222-8222-222222222222';

type SelectChain = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
};

const createDbMock = (): { db: DbMock; chain: SelectChain } => {
  const chain: SelectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(chain),
    },
    chain,
  };
};

describe('PresenceService', () => {
  let db: DbMock;
  let chain: SelectChain;
  let friendsRepository: { areContacts: ReturnType<typeof vi.fn> };
  let service: PresenceService;

  beforeEach(() => {
    const dbSetup = createDbMock();
    db = dbSetup.db;
    chain = dbSetup.chain;
    friendsRepository = {
      areContacts: vi.fn(),
    };
    service = new PresenceService(db as never, friendsRepository as never);
  });

  it('returns offline when presence sharing is contacts and requester is not a contact', async () => {
    chain.limit.mockResolvedValueOnce([
      {
        id: USER_ID,
        lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
        presenceEnabled: true,
        presenceSharing: 'contacts',
      },
    ]);
    friendsRepository.areContacts.mockResolvedValueOnce(false);

    const result = await service.getUserPresence(USER_ID, REQUESTER_ID);

    expect(result.status).toBe('offline');
    expect(result.lastActivity).toBeNull();
    expect(result.lastSeenAt).toBeNull();
    expect(friendsRepository.areContacts).toHaveBeenCalledWith(USER_ID, REQUESTER_ID);
  });

  it('returns online when presence sharing is contacts and requester is a contact', async () => {
    chain.limit.mockResolvedValueOnce([
      {
        id: USER_ID,
        lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
        presenceEnabled: true,
        presenceSharing: 'contacts',
      },
    ]);
    friendsRepository.areContacts.mockResolvedValueOnce(true);

    const result = await service.getUserPresence(USER_ID, REQUESTER_ID);

    expect(result.status).toBe('online');
  });
});
