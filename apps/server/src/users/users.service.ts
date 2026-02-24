import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import {
  updateProfileSchema,
  privacySettingsSchema,
  type UpdateProfileInput,
  type PrivacySettings,
  type UserPublic,
} from '@chat/shared';

/**
 * Pure function to sanitize user data for public response.
 * Removes sensitive fields like passwordHash, email, isActive.
 */
const sanitizeUser = (user: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
}): UserPublic => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
});

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Update user profile with validation.
   * Uses pure function composition for validation and sanitization.
   */
  async updateProfile(userId: string, input: unknown): Promise<UserPublic> {
    // Validate input with Zod schema (pure function)
    const validated = updateProfileSchema.safeParse(input);
    if (!validated.success) {
      const issues = validated.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      throw new BadRequestException(issues);
    }

    const data = validated.data as UpdateProfileInput;

    // Check if there's anything to update
    const hasUpdate = data.displayName !== undefined || data.avatarUrl !== undefined;
    if (!hasUpdate) {
      throw new BadRequestException([{ path: [], message: 'No fields provided for update' }]);
    }

    // Update via repository
    const user = await this.usersRepository.updateProfile(userId, data);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sanitize and return (pure function)
    return sanitizeUser(user);
  }

  /**
   * Update privacy settings with validation.
   */
  async updatePrivacy(userId: string, input: unknown): Promise<PrivacySettings> {
    // Validate input with Zod schema (pure function)
    const validated = privacySettingsSchema.safeParse(input);
    if (!validated.success) {
      const issues = validated.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      throw new BadRequestException(issues);
    }

    const data = validated.data as PrivacySettings;

    // Update via repository
    const result = await this.usersRepository.updatePrivacy(userId, data);
    if (!result) {
      throw new NotFoundException('User not found');
    }

    return result;
  }
}
