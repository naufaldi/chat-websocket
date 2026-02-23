import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersRepository } from './users.repository';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().min(3, 'Query must be at least 3 characters'),
  limit: z.number().min(1).max(50).default(20),
});

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

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
}
