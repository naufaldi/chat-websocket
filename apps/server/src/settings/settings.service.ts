import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import {
  settingsResponseSchema,
  updateProfileSettingsSchema,
  updatePrivacySettingsSchema,
  updateNotificationSettingsSchema,
  pushSubscriptionSchema,
  type SettingsResponse,
  type UpdateProfileSettings,
  type UpdatePrivacySettings,
  type UpdateNotificationSettings,
  type PushSubscriptionInput,
} from '@chat/shared';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  /**
   * Get all settings for a user
   */
  async getSettings(userId: string): Promise<SettingsResponse> {
    const settings = await this.settingsRepository.findSettingsByUserId(userId);

    if (!settings) {
      throw new NotFoundException('User not found');
    }

    // Validate response against schema
    const result = settingsResponseSchema.safeParse(settings);
    if (!result.success) {
      throw new BadRequestException('Invalid settings data');
    }

    return result.data;
  }

  /**
   * Update profile settings
   */
  async updateProfile(
    userId: string,
    data: unknown,
  ): Promise<SettingsResponse> {
    // Validate input
    const result = updateProfileSettingsSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const updateData = result.data as UpdateProfileSettings;

    // Update in database
    const updated = await this.settingsRepository.updateProfile(userId, {
      displayName: updateData.displayName,
      avatarUrl: updateData.avatarUrl,
      profilePhotoVisibility: updateData.profilePhotoVisibility,
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    // Validate response
    const responseResult = settingsResponseSchema.safeParse(updated);
    if (!responseResult.success) {
      throw new BadRequestException('Invalid settings response');
    }

    return responseResult.data;
  }

  /**
   * Update privacy settings
   */
  async updatePrivacy(
    userId: string,
    data: unknown,
  ): Promise<SettingsResponse> {
    // Validate input
    const result = updatePrivacySettingsSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const updateData = result.data as UpdatePrivacySettings;

    // Update in database
    const updated = await this.settingsRepository.updatePrivacy(userId, {
      presenceEnabled: updateData.presenceEnabled,
      presenceSharing: updateData.presenceSharing,
      readReceiptsEnabled: updateData.readReceiptsEnabled,
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    // Validate response
    const responseResult = settingsResponseSchema.safeParse(updated);
    if (!responseResult.success) {
      throw new BadRequestException('Invalid settings response');
    }

    return responseResult.data;
  }

  /**
   * Update notification settings
   */
  async updateNotifications(
    userId: string,
    data: unknown,
  ): Promise<SettingsResponse> {
    // Validate input
    const result = updateNotificationSettingsSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const updateData = result.data as UpdateNotificationSettings;

    // Update in database
    const updated = await this.settingsRepository.updateNotifications(userId, {
      pushNotificationsEnabled: updateData.pushNotificationsEnabled,
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    // Validate response
    const responseResult = settingsResponseSchema.safeParse(updated);
    if (!responseResult.success) {
      throw new BadRequestException('Invalid settings response');
    }

    return responseResult.data;
  }

  /**
   * Save push subscription
   */
  async savePushSubscription(
    userId: string,
    data: unknown,
  ): Promise<{ id: string }> {
    // Validate input
    const result = pushSubscriptionSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      );
    }

    const subscriptionData = result.data as PushSubscriptionInput;

    // Save to database
    return this.settingsRepository.savePushSubscription(userId, subscriptionData);
  }
}
