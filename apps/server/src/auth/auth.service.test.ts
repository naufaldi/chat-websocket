import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import type { UsersRepository } from '../users';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { TokenBlacklistService } from './token-blacklist.service';
import type { LoginDto, RegisterDto } from './dto';
import type { User } from '../users';

// Mock argon2
vi.mock('argon2', () => ({
  default: {
    verify: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed-password'),
    argon2id: 2,
  },
  verify: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('hashed-password'),
  argon2id: 2,
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersRepository: UsersRepository;
  let mockJwtService: JwtService;
  let mockConfigService: ConfigService;
  let mockTokenBlacklistService: TokenBlacklistService;

  const mockUser: User = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'person-a.demo@chat.local',
    username: 'person-a',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hashedpassword',
    displayName: 'Person A',
    avatarUrl: null,
    isActive: true,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Import mocked argon2
  let mockArgon2: { verify: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Import the mocked module
    const argon2Module = await import('argon2');
    mockArgon2 = argon2Module as unknown as { verify: ReturnType<typeof vi.fn> };

    mockUsersRepository = {
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateLastSeen: vi.fn(),
    } as unknown as UsersRepository;

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
      verify: vi.fn(),
    } as unknown as JwtService;

    mockConfigService = {
      get: vi.fn().mockReturnValue('mock-secret'),
    } as unknown as ConfigService;

    mockTokenBlacklistService = {
      add: vi.fn(),
      isBlacklisted: vi.fn().mockReturnValue(false),
    } as unknown as TokenBlacklistService;

    authService = new AuthService(
      mockUsersRepository,
      mockJwtService,
      mockConfigService,
      mockTokenBlacklistService,
    );
  });

  describe('login', () => {
    it('should return access token and refresh token on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'person-a.demo@chat.local',
        password: 'DemoPass123',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockJwtService.sign as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@chat.local',
        password: 'DemoPass123',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'person-a.demo@chat.local',
        password: 'WrongPassword123',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      // Mock argon2 to return false for this test - need to set it before each call
      const argon2Module = await import('argon2');
      (argon2Module.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');

      // Reset mock to default behavior (true) after this test
      (argon2Module.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      const loginDto: LoginDto = {
        email: 'person-a.demo@chat.local',
        password: 'DemoPass123',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(inactiveUser);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(loginDto)).rejects.toThrow('Account is deactivated');
    });

    it('should update last seen timestamp on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'person-a.demo@chat.local',
        password: 'DemoPass123',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockJwtService.sign as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      await authService.login(loginDto);

      expect(mockUsersRepository.updateLastSeen).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return user information without password hash', async () => {
      const loginDto: LoginDto = {
        email: 'person-a.demo@chat.local',
        password: 'DemoPass123',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockJwtService.sign as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.login(loginDto);

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('displayName');
      expect(result.user).toHaveProperty('createdAt');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('register', () => {
    it('should create new user and return tokens on successful registration', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@chat.local',
        username: 'newuser',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUsersRepository.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUsersRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockJwtService.sign as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockUsersRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@chat.local',
        username: 'newuser',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(authService.register(registerDto)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException when username already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@chat.local',
        username: 'existing-user',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      (mockUsersRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockUsersRepository.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(authService.register(registerDto)).rejects.toThrow('Username already taken');
    });
  });
});
