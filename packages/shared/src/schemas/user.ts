import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const userPublicSchema = userSchema.omit({
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const userSearchResultSchema = userPublicSchema.pick({
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
});

export const userSearchResponseSchema = z.object({
  users: z.array(userSearchResultSchema),
});

// Update profile schema
export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Note: Full privacy settings (with presenceEnabled, readReceiptsEnabled)
// is defined in settings.ts per RFC. This minimal schema is kept for backward
// compatibility with existing code that only needs presenceSharing.
// Deprecated: Use privacySettingsSchema from settings.ts for new code.
export const legacyPrivacySettingsSchema = z.object({
  presenceSharing: z.enum(['everyone', 'contacts', 'nobody']),
});

export type LegacyPrivacySettings = z.infer<typeof legacyPrivacySettingsSchema>;

export type User = z.infer<typeof userSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
export type UserSearchResult = z.infer<typeof userSearchResultSchema>;
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>;
