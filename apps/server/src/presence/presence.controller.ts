import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PresenceService } from './presence.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Presence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get(':userId/presence')
  @ApiOperation({ summary: 'Get user presence status' })
  @ApiParam({ name: 'userId', description: 'User UUID', required: true })
  @ApiResponse({ status: 200, description: 'User presence status' })
  @ApiResponse({ status: 403, description: 'Privacy settings prevent viewing' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPresence(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{
    userId: string;
    status: 'online' | 'offline';
    lastActivity: string | null;
    lastSeenAt: string | null;
  }> {
    return this.presenceService.getUserPresence(userId, req.user.userId);
  }
}
