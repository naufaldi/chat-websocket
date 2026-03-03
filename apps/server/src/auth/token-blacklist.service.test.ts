import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './token-blacklist.service';

const mockRedisClient = {
  connect: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  on: vi.fn(),
  quit: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

describe('TokenBlacklistService', () => {
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.get.mockResolvedValue('1');
    mockRedisClient.on.mockReturnValue(mockRedisClient);
    mockRedisClient.quit.mockResolvedValue(undefined);

    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'REDIS_URL') {
          return 'redis://localhost:6379';
        }
        return undefined;
      }),
    } as unknown as ConfigService;
  });

  it('stores blacklist entries in redis with expiration ttl', async () => {
    const service = new TokenBlacklistService(configService);
    const expiresAt = Date.now() + 60_000;

    await service.add('token-jti', expiresAt);

    expect(mockRedisClient.set).toHaveBeenCalled();
    expect(mockRedisClient.set.mock.calls[0][0]).toBe('token_blacklist:token-jti');
    expect(mockRedisClient.set.mock.calls[0][2]).toEqual(expect.objectContaining({ EX: expect.any(Number) }));
  });

  it('reads blacklist entries from redis', async () => {
    const service = new TokenBlacklistService(configService);

    const isBlacklisted = await service.isBlacklisted('token-jti');

    expect(mockRedisClient.get).toHaveBeenCalledWith('token_blacklist:token-jti');
    expect(isBlacklisted).toBe(true);
  });

  it('falls back to in-memory storage when redis is unavailable', async () => {
    const fallbackConfigService = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new TokenBlacklistService(fallbackConfigService);
    const expiresAt = Date.now() + 30_000;

    await service.add('fallback-token', expiresAt);
    const isBlacklisted = await service.isBlacklisted('fallback-token');

    expect(isBlacklisted).toBe(true);
  });

  it('keeps token revoked if redis read fails after successful redis write', async () => {
    const service = new TokenBlacklistService(configService);
    const expiresAt = Date.now() + 45_000;

    await service.add('degraded-token', expiresAt);
    mockRedisClient.get.mockRejectedValueOnce(new Error('redis unavailable'));

    const isBlacklisted = await service.isBlacklisted('degraded-token');

    expect(isBlacklisted).toBe(true);
  });
});
