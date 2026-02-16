import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard, ThrottlerWithHeadersGuard } from './guards';

interface RefreshResponse {
  accessToken: string;
}

interface UserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: Date;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerWithHeadersGuard)
  @Throttle({ short: { limit: 5, ttl: 900000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user', description: 'Create a new account with email, username, and password' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: AuthResponseDto
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(ThrottlerWithHeadersGuard)
  @Throttle({ short: { limit: 5, ttl: 900000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Get a new access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(@Body() body: { refreshToken: string }): Promise<RefreshResponse> {
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Check if refresh token is blacklisted
    if (this.authService.isRefreshTokenBlacklisted(refreshToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
      });

      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return this.authService.refreshTokens(payload.sub, payload.email);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user', description: 'Get information about the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: { user: { userId: string } }): Promise<UserResponse> {
    return this.authService.getMe(req.user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout', description: 'Invalidate current session tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Request() req: { user: { accessToken: string } },
    @Headers('authorization') authorization: string,
  ): Promise<{ message: string }> {
    // Extract refresh token from Authorization header (sent as Bearer refreshToken)
    const authHeader = authorization || '';
    let refreshToken = '';

    if (authHeader.startsWith('Bearer ')) {
      refreshToken = authHeader.substring(7);
    }

    await this.authService.logout(refreshToken);
    return { message: 'Logged out successfully' };
  }
}
