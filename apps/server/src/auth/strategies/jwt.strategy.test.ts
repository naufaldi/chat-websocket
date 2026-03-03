import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { TokenBlacklistService } from '../token-blacklist.service';
import type { UsersRepository } from '../../users/users.repository';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let configService: ConfigService;
  let usersRepository: UsersRepository;
  let tokenBlacklistService: TokenBlacklistService;
  let strategy: JwtStrategy;

  beforeEach(() => {
    configService = {
      get: vi.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;

    usersRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        isActive: true,
      }),
    } as unknown as UsersRepository;

    tokenBlacklistService = {
      isBlacklisted: vi.fn().mockResolvedValue(false),
    } as unknown as TokenBlacklistService;

    strategy = new JwtStrategy(configService, usersRepository, tokenBlacklistService);
  });

  it('rejects revoked token payloads', async () => {
    (tokenBlacklistService.isBlacklisted as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com', jti: 'jti-1' }, vi.fn()),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns validated user for active account and non-revoked token', async () => {
    const result = await strategy.validate(
      { sub: 'user-1', email: 'user@example.com', jti: 'jti-1' },
      vi.fn(),
    );

    expect(tokenBlacklistService.isBlacklisted).toHaveBeenCalledWith('jti-1');
    expect(result).toEqual({ userId: 'user-1', email: 'user@example.com' });
  });
});
