import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersRepository } from '../users';
import { RegisterDto, LoginDto, AuthResponseDto, UserDto } from './dto';

interface TokenResponse {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email exists
    const existingEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username exists
    const existingUsername = await this.usersRepository.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      password: dto.password, // Required by type but not used
      passwordHash,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };

    return {
      accessToken: tokens.accessToken,
      user: userDto,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last seen
    await this.usersRepository.updateLastSeen(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };

    return {
      accessToken: tokens.accessToken,
      user: userDto,
    };
  }

  async refreshTokens(userId: string, email: string): Promise<TokenResponse> {
    const tokens = await this.generateTokens(userId, email);
    return { accessToken: tokens.accessToken };
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(userId: string, email: string): Promise<TokenResponse> {
    const payload = { sub: userId, email };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    return { accessToken };
  }
}
