import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { users, pushSubscriptions } from '@chat/db';
import type { SettingsResponse, PushSubscriptionInput } from '@chat/shared';

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Get all settings for a user
   */
  async findSettingsByUserId(userId: string): Promise<SettingsResponse | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        profilePhotoVisibility: users.profilePhotoVisibility,
        presenceEnabled: users.presenceEnabled,
        presenceSharing: users.presenceSharing,
        readReceiptsEnabled: users.readReceiptsEnabled,
        pushNotificationsEnabled: users.pushNotificationsEnabled,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profilePhotoVisibility: user.profilePhotoVisibility,
      presenceEnabled: user.presenceEnabled,
      presenceSharing: user.presenceSharing,
      readReceiptsEnabled: user.readReceiptsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    } as SettingsResponse;
  }

  /**
   * Update profile settings
   */
  async updateProfile(
    userId: string,
    data: Partial<{
      displayName: string;
      avatarUrl: string | null;
      profilePhotoVisibility: 'everyone' | 'friends' | 'nobody';
    }>,
  ): Promise<SettingsResponse | null> {
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    if (data.profilePhotoVisibility !== undefined) {
      updateData.profilePhotoVisibility = data.profilePhotoVisibility;
    }

    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        profilePhotoVisibility: users.profilePhotoVisibility,
        presenceEnabled: users.presenceEnabled,
        presenceSharing: users.presenceSharing,
        readReceiptsEnabled: users.readReceiptsEnabled,
        pushNotificationsEnabled: users.pushNotificationsEnabled,
      });

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profilePhotoVisibility: user.profilePhotoVisibility,
      presenceEnabled: user.presenceEnabled,
      presenceSharing: user.presenceSharing,
      readReceiptsEnabled: user.readReceiptsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    } as SettingsResponse;
  }

  /**
   * Update privacy settings
   */
  async updatePrivacy(
    userId: string,
    data: Partial<{
      presenceEnabled: boolean;
      presenceSharing: 'everyone' | 'friends' | 'nobody';
      readReceiptsEnabled: boolean;
    }>,
  ): Promise<SettingsResponse | null> {
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.presenceEnabled !== undefined) {
      updateData.presenceEnabled = data.presenceEnabled;
    }

    if (data.presenceSharing !== undefined) {
      updateData.presenceSharing = data.presenceSharing;
    }

    if (data.readReceiptsEnabled !== undefined) {
      updateData.readReceiptsEnabled = data.readReceiptsEnabled;
    }

    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        profilePhotoVisibility: users.profilePhotoVisibility,
        presenceEnabled: users.presenceEnabled,
        presenceSharing: users.presenceSharing,
        readReceiptsEnabled: users.readReceiptsEnabled,
        pushNotificationsEnabled: users.pushNotificationsEnabled,
      });

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profilePhotoVisibility: user.profilePhotoVisibility,
      presenceEnabled: user.presenceEnabled,
      presenceSharing: user.presenceSharing,
      readReceiptsEnabled: user.readReceiptsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    } as SettingsResponse;
  }

  /**
   * Update notification settings
   */
  async updateNotifications(
    userId: string,
    data: {
      pushNotificationsEnabled: boolean;
    },
  ): Promise<SettingsResponse | null> {
    const [user] = await this.db
      .update(users)
      .set({
        pushNotificationsEnabled: data.pushNotificationsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        profilePhotoVisibility: users.profilePhotoVisibility,
        presenceEnabled: users.presenceEnabled,
        presenceSharing: users.presenceSharing,
        readReceiptsEnabled: users.readReceiptsEnabled,
        pushNotificationsEnabled: users.pushNotificationsEnabled,
      });

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profilePhotoVisibility: user.profilePhotoVisibility,
      presenceEnabled: user.presenceEnabled,
      presenceSharing: user.presenceSharing,
      readReceiptsEnabled: user.readReceiptsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    } as SettingsResponse;
  }

  /**
   * Save push subscription
   */
  async savePushSubscription(
    userId: string,
    data: PushSubscriptionInput,
  ): Promise<{ id: string }> {
    const [subscription] = await this.db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: data.endpoint,
        p256dhKey: data.p256dhKey,
        authKey: data.authKey,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dhKey: data.p256dhKey,
          authKey: data.authKey,
          createdAt: new Date(),
        },
      })
      .returning({ id: pushSubscriptions.id });

    return subscription;
  }

  /**
   * Get push subscriptions for a user
   */
  async findPushSubscriptionsByUserId(userId: string): Promise<Array<{ id: string; endpoint: string; p256dhKey: string; authKey: string }>> {
    return this.db
      .select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        p256dhKey: pushSubscriptions.p256dhKey,
        authKey: pushSubscriptions.authKey,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }
}
