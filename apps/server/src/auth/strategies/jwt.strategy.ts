import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../../users/users.repository';
import { TokenBlacklistService } from '../token-blacklist.service';

interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
}

interface UserValidateResponse {
  userId: string;
  email: string;
  accessToken?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  // Allow refresh endpoint to accept expired tokens
  async validate(payload: JwtPayload, _done: (err: Error | null, user?: UserValidateResponse) => void): Promise<UserValidateResponse> {
    // Check if token is blacklisted
    if (payload.jti && this.tokenBlacklistService.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return { userId: user.id, email: user.email };
  }
}

// Extended strategy that ignores token expiration (for refresh endpoint)
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // Allow expired tokens for refresh
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserValidateResponse> {
    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return { userId: user.id, email: user.email };
  }
}
