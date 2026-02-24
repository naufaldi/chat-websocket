import {
  Controller,
  Get,
  Patch,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { z } from 'zod';
import type { UserPublic, PrivacySettings } from '@chat/shared';

const searchQuerySchema = z.object({
  q: z.string().min(3, 'Query must be at least 3 characters'),
  limit: z.number().min(1).max(50).default(20),
});

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
  ) {}

  @Get('search')
  @Throttle({ search: { ttl: 60000, limit: 10 } }) // 10 per minute
  @ApiOperation({ summary: 'Search users by username or display name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (minimum 3 characters)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default: 20, max: 50)' })
  @ApiResponse({ status: 200, description: 'Matching users' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  async searchUsers(
    @Request() req: { user: { userId: string } },
    @Query('q') query?: string,
    @Query('limit') rawLimit?: string,
  ): Promise<{
    users: Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>;
  }> {
    const q = query?.trim() ?? '';

    // Parse and clamp limit
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 20;
    const validLimit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
    const safeLimit = validLimit < 1 ? 1 : validLimit > 50 ? 50 : validLimit;

    // Zod validation for query
    const result = searchQuerySchema.safeParse({ q, limit: safeLimit });
    if (!result.success) {
      return { users: [] };
    }

    const users = await this.usersRepository.searchPublicUsers(result.data.q, req.user.userId, result.data.limit);

    return { users };
  }

  @Patch('me')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Update current user profile', description: 'Update display name and/or avatar URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', minLength: 1, maxLength: 100, example: 'John Doe' },
        avatarUrl: { type: 'string', format: 'url', nullable: true, example: 'https://example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        username: { type: 'string' },
        displayName: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        isActive: { type: 'boolean' },
        lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error - invalid input data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() body: unknown,
  ): Promise<UserPublic> {
    // Service throws appropriate exceptions for error cases
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Patch('me/privacy')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Update privacy settings', description: 'Update presence sharing preferences' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['presenceSharing'],
      properties: {
        presenceSharing: {
          type: 'string',
          enum: ['everyone', 'friends', 'nobody'],
          example: 'everyone',
          description: 'Who can see your online status',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Privacy settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        presenceSharing: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error - invalid input data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async updatePrivacy(
    @Request() req: { user: { userId: string } },
    @Body() body: unknown,
  ): Promise<PrivacySettings> {
    // Service throws appropriate exceptions for error cases
    return this.usersService.updatePrivacy(req.user.userId, body);
  }
}
