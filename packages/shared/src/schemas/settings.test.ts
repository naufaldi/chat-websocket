/**
 * Settings Schema Validation Tests
 *
 * TDD approach: Tests for all settings schemas as the single source of truth.
 * Run: cd packages/shared && bun test src/schemas/settings.test.ts
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  // Profile settings
  profilePhotoVisibilitySchema,
  profileSettingsSchema,
  updateProfileSettingsSchema,
  // Privacy settings
  presenceSharingSchema,
  privacySettingsSchema,
  updatePrivacySettingsSchema,
  // Notification settings
  notificationSettingsSchema,
  updateNotificationSettingsSchema,
  // Combined response
  settingsResponseSchema,
  // Change password
  changePasswordSchema,
  // Push subscription
  pushSubscriptionSchema,
  // Error schemas
  apiFieldErrorSchema,
  apiErrorResponseSchema,
} from './settings.js';

// ============================================================================
// PROFILE SETTINGS SCHEMA TESTS
// ============================================================================

describe('Profile Settings Schemas', () => {
  describe('profilePhotoVisibilitySchema', () => {
    it('accepts valid visibility values', () => {
      expect(() => profilePhotoVisibilitySchema.parse('everyone')).not.toThrow();
      expect(() => profilePhotoVisibilitySchema.parse('contacts')).not.toThrow();
      expect(() => profilePhotoVisibilitySchema.parse('nobody')).not.toThrow();
    });

    it('rejects invalid visibility values', () => {
      expect(() => profilePhotoVisibilitySchema.parse('public')).toThrow();
      expect(() => profilePhotoVisibilitySchema.parse('')).toThrow();
      expect(() => profilePhotoVisibilitySchema.parse('friends')).toThrow();
    });
  });

  describe('profileSettingsSchema', () => {
    it('validates complete profile settings', () => {
      const validSettings = {
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        profilePhotoVisibility: 'everyone' as const,
      };
      expect(() => profileSettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('validates with null avatarUrl', () => {
      const validSettings = {
        displayName: 'John Doe',
        avatarUrl: null,
        profilePhotoVisibility: 'contacts' as const,
      };
      expect(() => profileSettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects empty display name', () => {
      const invalidSettings = {
        displayName: '',
        avatarUrl: null,
        profilePhotoVisibility: 'everyone' as const,
      };
      expect(() => profileSettingsSchema.parse(invalidSettings)).toThrow('Display name cannot be empty');
    });

    it('rejects whitespace-only display name', () => {
      const invalidSettings = {
        displayName: '   ',
        avatarUrl: null,
        profilePhotoVisibility: 'everyone' as const,
      };
      expect(() => profileSettingsSchema.parse(invalidSettings)).toThrow('Display name cannot be only whitespace');
    });

    it('rejects display name over 100 characters', () => {
      const invalidSettings = {
        displayName: 'a'.repeat(101),
        avatarUrl: null,
        profilePhotoVisibility: 'everyone' as const,
      };
      expect(() => profileSettingsSchema.parse(invalidSettings)).toThrow('Display name must be at most 100 characters');
    });

    it('rejects invalid avatar URL format', () => {
      const invalidSettings = {
        displayName: 'John Doe',
        avatarUrl: 'not-a-valid-url',
        profilePhotoVisibility: 'everyone' as const,
      };
      expect(() => profileSettingsSchema.parse(invalidSettings)).toThrow('Avatar URL must be a valid URL');
    });

    it('rejects avatar URL over 500 characters', () => {
      const invalidSettings = {
        displayName: 'John Doe',
        avatarUrl: `https://example.com/${'a'.repeat(500)}.jpg`,
        profilePhotoVisibility: 'everyone' as const,
      };
      expect(() => profileSettingsSchema.parse(invalidSettings)).toThrow('Avatar URL must be at most 500 characters');
    });

    it('trims whitespace from display name', () => {
      const settings = {
        displayName: '  John Doe  ',
        avatarUrl: null,
        profilePhotoVisibility: 'everyone' as const,
      };
      const result = profileSettingsSchema.parse(settings);
      expect(result.displayName).toBe('John Doe');
    });
  });

  describe('updateProfileSettingsSchema (PATCH)', () => {
    it('accepts partial profile updates', () => {
      expect(() => updateProfileSettingsSchema.parse({ displayName: 'New Name' })).not.toThrow();
      expect(() => updateProfileSettingsSchema.parse({ avatarUrl: 'https://example.com/new.jpg' })).not.toThrow();
      expect(() => updateProfileSettingsSchema.parse({ profilePhotoVisibility: 'nobody' as const })).not.toThrow();
    });

    it('accepts empty object for no-op updates', () => {
      expect(() => updateProfileSettingsSchema.parse({})).not.toThrow();
    });

    it('still validates provided fields', () => {
      expect(() => updateProfileSettingsSchema.parse({ displayName: '' })).toThrow();
    });
  });
});

// ============================================================================
// PRIVACY SETTINGS SCHEMA TESTS
// ============================================================================

describe('Privacy Settings Schemas', () => {
  describe('presenceSharingSchema', () => {
    it('accepts valid sharing values', () => {
      expect(() => presenceSharingSchema.parse('everyone')).not.toThrow();
      expect(() => presenceSharingSchema.parse('contacts')).not.toThrow();
      expect(() => presenceSharingSchema.parse('nobody')).not.toThrow();
    });

    it('rejects invalid sharing values', () => {
      expect(() => presenceSharingSchema.parse('friends')).toThrow();
      expect(() => presenceSharingSchema.parse('public')).toThrow();
      expect(() => presenceSharingSchema.parse('')).toThrow();
    });
  });

  describe('privacySettingsSchema', () => {
    it('validates complete privacy settings', () => {
      const validSettings = {
        presenceEnabled: true,
        presenceSharing: 'everyone' as const,
        readReceiptsEnabled: true,
      };
      expect(() => privacySettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('validates with all false values', () => {
      const validSettings = {
        presenceEnabled: false,
        presenceSharing: 'nobody' as const,
        readReceiptsEnabled: false,
      };
      expect(() => privacySettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('validates with contacts sharing', () => {
      const validSettings = {
        presenceEnabled: true,
        presenceSharing: 'contacts' as const,
        readReceiptsEnabled: true,
      };
      expect(() => privacySettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects non-boolean presenceEnabled', () => {
      const invalidSettings = {
        presenceEnabled: 'yes',
        presenceSharing: 'everyone' as const,
        readReceiptsEnabled: true,
      };
      expect(() => privacySettingsSchema.parse(invalidSettings)).toThrow();
    });

    it('rejects non-boolean readReceiptsEnabled', () => {
      const invalidSettings = {
        presenceEnabled: true,
        presenceSharing: 'everyone' as const,
        readReceiptsEnabled: 'yes',
      };
      expect(() => privacySettingsSchema.parse(invalidSettings)).toThrow();
    });
  });

  describe('updatePrivacySettingsSchema (PATCH)', () => {
    it('accepts partial privacy updates', () => {
      expect(() => updatePrivacySettingsSchema.parse({ presenceEnabled: false })).not.toThrow();
      expect(() => updatePrivacySettingsSchema.parse({ presenceSharing: 'contacts' as const })).not.toThrow();
      expect(() => updatePrivacySettingsSchema.parse({ readReceiptsEnabled: false })).not.toThrow();
    });

    it('accepts empty object for no-op updates', () => {
      expect(() => updatePrivacySettingsSchema.parse({})).not.toThrow();
    });

    it('still validates provided fields', () => {
      expect(() => updatePrivacySettingsSchema.parse({ presenceSharing: 'friends' })).toThrow();
    });
  });
});

// ============================================================================
// NOTIFICATION SETTINGS SCHEMA TESTS
// ============================================================================

describe('Notification Settings Schemas', () => {
  describe('notificationSettingsSchema', () => {
    it('validates enabled notifications', () => {
      const validSettings = {
        pushNotificationsEnabled: true,
      };
      expect(() => notificationSettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('validates disabled notifications', () => {
      const validSettings = {
        pushNotificationsEnabled: false,
      };
      expect(() => notificationSettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects non-boolean value', () => {
      const invalidSettings = {
        pushNotificationsEnabled: 'enabled',
      };
      expect(() => notificationSettingsSchema.parse(invalidSettings)).toThrow();
    });
  });

  describe('updateNotificationSettingsSchema (PATCH)', () => {
    it('accepts partial updates', () => {
      expect(() => updateNotificationSettingsSchema.parse({ pushNotificationsEnabled: true })).not.toThrow();
    });

    it('accepts empty object for no-op updates', () => {
      expect(() => updateNotificationSettingsSchema.parse({})).not.toThrow();
    });
  });
});

// ============================================================================
// SETTINGS RESPONSE SCHEMA TESTS
// ============================================================================

describe('Settings Response Schema', () => {
  it('validates complete settings response', () => {
    const validResponse = {
      // Profile
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      profilePhotoVisibility: 'everyone' as const,
      // Privacy
      presenceEnabled: true,
      presenceSharing: 'everyone' as const,
      readReceiptsEnabled: true,
      // Notifications
      pushNotificationsEnabled: false,
      // Account (read-only)
      email: 'john@example.com',
      username: 'johndoe',
    };
    expect(() => settingsResponseSchema.parse(validResponse)).not.toThrow();
  });

  it('validates with null avatarUrl', () => {
    const validResponse = {
      displayName: 'John Doe',
      avatarUrl: null,
      profilePhotoVisibility: 'contacts' as const,
      presenceEnabled: true,
      presenceSharing: 'contacts' as const,
      readReceiptsEnabled: true,
      pushNotificationsEnabled: true,
      email: 'john@example.com',
      username: 'johndoe',
    };
    expect(() => settingsResponseSchema.parse(validResponse)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const invalidResponse = {
      displayName: 'John Doe',
      avatarUrl: null,
      profilePhotoVisibility: 'everyone' as const,
      presenceEnabled: true,
      presenceSharing: 'everyone' as const,
      readReceiptsEnabled: true,
      pushNotificationsEnabled: false,
      email: 'not-an-email',
      username: 'johndoe',
    };
    expect(() => settingsResponseSchema.parse(invalidResponse)).toThrow();
  });

  it('rejects missing required fields', () => {
    const incompleteResponse = {
      displayName: 'John Doe',
      // Missing other required fields
    };
    expect(() => settingsResponseSchema.parse(incompleteResponse)).toThrow();
  });
});

// ============================================================================
// CHANGE PASSWORD SCHEMA TESTS
// ============================================================================

describe('Change Password Schema', () => {
  it('validates correct password change', () => {
    const validInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'NewSecurePass456',
      confirmPassword: 'NewSecurePass456',
    };
    expect(() => changePasswordSchema.parse(validInput)).not.toThrow();
  });

  it('rejects when new password does not match confirm password', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'NewSecurePass456',
      confirmPassword: 'DifferentPass789',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Passwords do not match');
  });

  it('rejects empty current password', () => {
    const invalidInput = {
      currentPassword: '',
      newPassword: 'NewSecurePass456',
      confirmPassword: 'NewSecurePass456',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Current password is required');
  });

  it('rejects new password under 8 characters', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'Short1',
      confirmPassword: 'Short1',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Password must be at least 8 characters');
  });

  it('rejects new password without uppercase', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'lowercase123',
      confirmPassword: 'lowercase123',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Password must contain at least one uppercase letter');
  });

  it('rejects new password without lowercase', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'UPPERCASE123',
      confirmPassword: 'UPPERCASE123',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Password must contain at least one lowercase letter');
  });

  it('rejects new password without number', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'NoNumbersHere',
      confirmPassword: 'NoNumbersHere',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Password must contain at least one number');
  });

  it('rejects new password over 100 characters', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'A1' + 'a'.repeat(100),
      confirmPassword: 'A1' + 'a'.repeat(100),
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Password must be at most 100 characters');
  });

  it('rejects empty confirm password', () => {
    const invalidInput = {
      currentPassword: 'CurrentPass123',
      newPassword: 'NewSecurePass456',
      confirmPassword: '',
    };
    expect(() => changePasswordSchema.parse(invalidInput)).toThrow('Please confirm your password');
  });
});

// ============================================================================
// PUSH SUBSCRIPTION SCHEMA TESTS
// ============================================================================

describe('Push Subscription Schema', () => {
  it('validates complete push subscription', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-token',
      p256dhKey: 'BNcRdre...base64key',
      authKey: 'authSecret...base64',
    };
    expect(() => pushSubscriptionSchema.parse(validSubscription)).not.toThrow();
  });

  it('rejects invalid endpoint URL', () => {
    const invalidSubscription = {
      endpoint: 'not-a-valid-url',
      p256dhKey: 'BNcRdre...base64key',
      authKey: 'authSecret...base64',
    };
    expect(() => pushSubscriptionSchema.parse(invalidSubscription)).toThrow('Endpoint must be a valid URL');
  });

  it('rejects endpoint over 500 characters', () => {
    const invalidSubscription = {
      endpoint: `https://fcm.googleapis.com/${'a'.repeat(500)}/send/token`,
      p256dhKey: 'BNcRdre...base64key',
      authKey: 'authSecret...base64',
    };
    expect(() => pushSubscriptionSchema.parse(invalidSubscription)).toThrow('Endpoint must be at most 500 characters');
  });

  it('rejects empty p256dhKey', () => {
    const invalidSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-token',
      p256dhKey: '',
      authKey: 'authSecret...base64',
    };
    expect(() => pushSubscriptionSchema.parse(invalidSubscription)).toThrow('P256DH key is required');
  });

  it('rejects empty authKey', () => {
    const invalidSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-token',
      p256dhKey: 'BNcRdre...base64key',
      authKey: '',
    };
    expect(() => pushSubscriptionSchema.parse(invalidSubscription)).toThrow('Auth key is required');
  });
});

// ============================================================================
// ERROR SCHEMAS TESTS
// ============================================================================

describe('API Error Schemas', () => {
  describe('apiFieldErrorSchema', () => {
    it('validates field error', () => {
      const validError = {
        field: 'displayName',
        message: 'Display name cannot be empty',
      };
      expect(() => apiFieldErrorSchema.parse(validError)).not.toThrow();
    });

    it('rejects missing field', () => {
      const invalidError = {
        message: 'Display name cannot be empty',
      };
      expect(() => apiFieldErrorSchema.parse(invalidError)).toThrow();
    });
  });

  describe('apiErrorResponseSchema', () => {
    it('validates error response with field errors', () => {
      const validResponse = {
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          { field: 'displayName', message: 'Display name cannot be empty' },
          { field: 'avatarUrl', message: 'Invalid URL format' },
        ],
      };
      expect(() => apiErrorResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('validates error response without field errors', () => {
      const validResponse = {
        statusCode: 401,
        message: 'Unauthorized',
      };
      expect(() => apiErrorResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('rejects negative status code', () => {
      const invalidResponse = {
        statusCode: -1,
        message: 'Error',
      };
      expect(() => apiErrorResponseSchema.parse(invalidResponse)).toThrow();
    });

    it('rejects zero status code', () => {
      const invalidResponse = {
        statusCode: 0,
        message: 'Error',
      };
      expect(() => apiErrorResponseSchema.parse(invalidResponse)).toThrow();
    });

    it('rejects float status code', () => {
      const invalidResponse = {
        statusCode: 400.5,
        message: 'Error',
      };
      expect(() => apiErrorResponseSchema.parse(invalidResponse)).toThrow();
    });
  });
});

// ============================================================================
// TYPE INFERENCE TESTS
// ============================================================================

describe('Settings Schema Type Inference', () => {
  it('correctly infers ProfileSettings type', () => {
    const settings: z.infer<typeof profileSettingsSchema> = {
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      profilePhotoVisibility: 'everyone',
    };
    expect(settings.displayName).toBeDefined();
    expect(settings.profilePhotoVisibility).toBe('everyone');
  });

  it('correctly infers PrivacySettings type', () => {
    const settings: z.infer<typeof privacySettingsSchema> = {
      presenceEnabled: true,
      presenceSharing: 'contacts',
      readReceiptsEnabled: false,
    };
    expect(settings.presenceSharing).toBe('contacts');
  });

  it('correctly infers ChangePasswordInput type', () => {
    const input: z.infer<typeof changePasswordSchema> = {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass456',
      confirmPassword: 'NewPass456',
    };
    expect(input.newPassword).toBeDefined();
  });

  it('correctly infers PushSubscriptionInput type', () => {
    const input: z.infer<typeof pushSubscriptionSchema> = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/token',
      p256dhKey: 'key',
      authKey: 'auth',
    };
    expect(input.endpoint).toBeDefined();
  });

  it('correctly infers ApiErrorResponse type', () => {
    const error: z.infer<typeof apiErrorResponseSchema> = {
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ field: 'name', message: 'Required' }],
    };
    expect(error.statusCode).toBe(400);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Settings Schema Edge Cases', () => {
  it('handles display name at exactly 100 characters', () => {
    const settings = {
      displayName: 'a'.repeat(100),
      avatarUrl: null,
      profilePhotoVisibility: 'everyone' as const,
    };
    expect(() => profileSettingsSchema.parse(settings)).not.toThrow();
  });

  it('handles display name at exactly 1 character', () => {
    const settings = {
      displayName: 'X',
      avatarUrl: null,
      profilePhotoVisibility: 'everyone' as const,
    };
    expect(() => profileSettingsSchema.parse(settings)).not.toThrow();
  });

  it('handles unicode in display name', () => {
    const settings = {
      displayName: 'John Doe 👋',
      avatarUrl: null,
      profilePhotoVisibility: 'everyone' as const,
    };
    expect(() => profileSettingsSchema.parse(settings)).not.toThrow();
  });

  it('handles complex avatar URLs', () => {
    const settings = {
      displayName: 'John Doe',
      avatarUrl: 'https://cdn.example.com/avatars/user_123.jpg?size=256&format=webp',
      profilePhotoVisibility: 'everyone' as const,
    };
    expect(() => profileSettingsSchema.parse(settings)).not.toThrow();
  });

  it('handles long but valid avatar URLs under 500 characters', () => {
    const settings = {
      displayName: 'John Doe',
      avatarUrl: `https://cdn.example.com/avatars/users/${'a'.repeat(400)}/profile.jpg`,
      profilePhotoVisibility: 'everyone' as const,
    };
    expect(() => profileSettingsSchema.parse(settings)).not.toThrow();
  });

  it('handles special characters in push keys', () => {
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-token',
      p256dhKey: 'BNcRdreAL9hDImQ8reOqx4E/5j3+L+3n4f4f4f4f4f4=',
      authKey: 'authSecret+/=',
    };
    expect(() => pushSubscriptionSchema.parse(subscription)).not.toThrow();
  });
});
