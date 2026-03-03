import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(() => {
    authService = {
      isRefreshTokenBlacklisted: vi.fn().mockResolvedValue(false),
      refreshTokens: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    } as unknown as AuthService;

    jwtService = {
      verify: vi.fn().mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
      }),
    } as unknown as JwtService;

    configService = {
      get: vi.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;

    controller = new AuthController(authService, jwtService, configService);
  });

  it('rejects refresh token when it is blacklisted', async () => {
    (authService.isRefreshTokenBlacklisted as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(
      controller.refresh({ refreshToken: 'revoked-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refreshes tokens when refresh token is valid and not blacklisted', async () => {
    const result = await controller.refresh({ refreshToken: 'valid-token' });

    expect(authService.isRefreshTokenBlacklisted).toHaveBeenCalledWith('valid-token');
    expect(authService.refreshTokens).toHaveBeenCalledWith('user-1', 'user@example.com');
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });
});
