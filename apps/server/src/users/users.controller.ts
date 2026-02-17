import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersRepository } from './users.repository';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or display name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (minimum 3 characters)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default: 20, max: 50)' })
  @ApiResponse({ status: 200, description: 'Matching users' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  async searchUsers(
    @Request() req: { user: { userId: string } },
    @Query('q') query?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<{
    users: Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>;
  }> {
    const q = query?.trim() ?? '';
    if (q.length < 3) {
      throw new BadRequestException('Query must be at least 3 characters');
    }

    const safeLimit = Math.min(Math.max(1, limit || 20), 50);
    const users = await this.usersRepository.searchPublicUsers(q, req.user.userId, safeLimit);

    return { users };
  }
}
