import { z } from 'zod';
import { presenceSharingSchema } from './presence.js';

// ============================================================================
// Profile Settings
// ============================================================================

/**
 * Profile photo visibility uses the same enum as presence sharing.
 * Per RFC: everyone | contacts | nobody
 */
export const profilePhotoVisibilitySchema = presenceSharingSchema;

export const profileSettingsSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name must be at most 100 characters')
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, {
      message: 'Display name cannot be only whitespace',
    }),
  avatarUrl: z.string()
    .max(500, 'Avatar URL must be at most 500 characters')
    .url('Avatar URL must be a valid URL')
    .nullable(),
  profilePhotoVisibility: profilePhotoVisibilitySchema,
});

// Partial schema for PATCH requests (all fields optional)
export const updateProfileSettingsSchema = profileSettingsSchema.partial();

// ============================================================================
// Privacy Settings
// ============================================================================

export const privacySettingsSchema = z.object({
  presenceEnabled: z.boolean(),
  presenceSharing: presenceSharingSchema,
  readReceiptsEnabled: z.boolean(),
});

// Partial schema for PATCH requests
export const updatePrivacySettingsSchema = privacySettingsSchema.partial();

// ============================================================================
// Notification Settings
// ============================================================================

export const notificationSettingsSchema = z.object({
  pushNotificationsEnabled: z.boolean(),
});

// Partial schema for PATCH requests
export const updateNotificationSettingsSchema = notificationSettingsSchema.partial();

// ============================================================================
// Combined Settings Response (GET /api/settings)
// ============================================================================

export const settingsResponseSchema = z.object({
  // Profile fields
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  profilePhotoVisibility: profilePhotoVisibilitySchema,

  // Privacy fields
  presenceEnabled: z.boolean(),
  presenceSharing: presenceSharingSchema,
  readReceiptsEnabled: z.boolean(),

  // Notification fields
  pushNotificationsEnabled: z.boolean(),

  // Read-only account fields
  email: z.string().email(),
  username: z.string(),
});

// ============================================================================
// Change Password
// ============================================================================

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// Push Subscription
// ============================================================================

export const pushSubscriptionSchema = z.object({
  endpoint: z.string()
    .url('Endpoint must be a valid URL')
    .max(500, 'Endpoint must be at most 500 characters'),
  p256dhKey: z.string()
    .min(1, 'P256DH key is required'),
  authKey: z.string()
    .min(1, 'Auth key is required'),
});

// ============================================================================
// API Error Handling
// ============================================================================

export const apiFieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int().positive(),
  message: z.string(),
  errors: z.array(apiFieldErrorSchema).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ProfilePhotoVisibility = z.infer<typeof profilePhotoVisibilitySchema>;
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type UpdateProfileSettings = z.infer<typeof updateProfileSettingsSchema>;

// Re-export from presence.ts for convenience
export type { PresenceSharing } from './presence.js';
export { presenceSharingSchema };

export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type UpdatePrivacySettings = z.infer<typeof updatePrivacySettingsSchema>;

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type UpdateNotificationSettings = z.infer<typeof updateNotificationSettingsSchema>;

export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export type ApiFieldError = z.infer<typeof apiFieldErrorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
