import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import type { SettingsResponse } from '@chat/shared';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user settings', description: 'Retrieve profile, privacy, and notification settings for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
        displayName: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        profilePhotoVisibility: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        presenceEnabled: { type: 'boolean' },
        presenceSharing: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        readReceiptsEnabled: { type: 'boolean' },
        pushNotificationsEnabled: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getSettings(
    @Request() req: { user: { userId: string } },
  ): Promise<SettingsResponse> {
    return this.settingsService.getSettings(req.user.userId);
  }

  @Patch('profile')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Update profile settings', description: 'Update display name, avatar URL, and profile photo visibility' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', minLength: 1, maxLength: 100, example: 'John Doe' },
        avatarUrl: { type: 'string', format: 'url', nullable: true, example: 'https://example.com/avatar.jpg' },
        profilePhotoVisibility: { type: 'string', enum: ['everyone', 'friends', 'nobody'], example: 'everyone' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
        displayName: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        profilePhotoVisibility: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        presenceEnabled: { type: 'boolean' },
        presenceSharing: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        readReceiptsEnabled: { type: 'boolean' },
        pushNotificationsEnabled: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() body: unknown,
  ): Promise<SettingsResponse> {
    return this.settingsService.updateProfile(req.user.userId, body);
  }

  @Patch('privacy')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Update privacy settings', description: 'Update presence and read receipt settings' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        presenceEnabled: { type: 'boolean', example: true },
        presenceSharing: { type: 'string', enum: ['everyone', 'friends', 'nobody'], example: 'everyone' },
        readReceiptsEnabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Privacy settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
        displayName: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        profilePhotoVisibility: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        presenceEnabled: { type: 'boolean' },
        presenceSharing: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        readReceiptsEnabled: { type: 'boolean' },
        pushNotificationsEnabled: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updatePrivacy(
    @Request() req: { user: { userId: string } },
    @Body() body: unknown,
  ): Promise<SettingsResponse> {
    return this.settingsService.updatePrivacy(req.user.userId, body);
  }

  @Patch('notifications')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Update notification settings', description: 'Update push notification preferences' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pushNotificationsEnabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
        displayName: { type: 'string' },
        avatarUrl: { type: 'string', nullable: true },
        profilePhotoVisibility: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        presenceEnabled: { type: 'boolean' },
        presenceSharing: { type: 'string', enum: ['everyone', 'friends', 'nobody'] },
        readReceiptsEnabled: { type: 'boolean' },
        pushNotificationsEnabled: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateNotifications(
    @Request() req: { user: { userId: string } },
    @Body() body: unknown,
  ): Promise<SettingsResponse> {
    return this.settingsService.updateNotifications(req.user.userId, body);
  }

  @Post('push-subscription')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiOperation({ summary: 'Register push subscription', description: 'Save a Web Push subscription for the current user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['endpoint', 'p256dhKey', 'authKey'],
      properties: {
        endpoint: { type: 'string', format: 'url', example: 'https://fcm.googleapis.com/fcm/send/...' },
        p256dhKey: { type: 'string', example: 'BIP...' },
        authKey: { type: 'string', example: 'aUq...' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Push subscription saved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async savePushSubscription(
    @Request() req: { user: { userId: string } },
    @Body() body: unknown,
  ): Promise<{ id: string }> {
    return this.settingsService.savePushSubscription(req.user.userId, body);
  }
}
