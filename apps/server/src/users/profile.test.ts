/**
 * User Profile & Settings Tests
 * 
 * Tests for TASK-012: Settings & Profile Page
 * 
 * Run: bun test src/users/profile.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  updateProfileSchema,
  privacySettingsSchema,
} from '@chat/shared';

describe('User Profile Schemas', () => {
  describe('updateProfileSchema', () => {
    it('validates update with displayName only', () => {
      const input = { displayName: 'New Name' };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates update with avatarUrl', () => {
      const input = { avatarUrl: 'https://example.com/avatar.jpg' };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates update with both fields', () => {
      const input = { 
        displayName: 'New Name',
        avatarUrl: 'https://example.com/avatar.jpg'
      };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates empty update', () => {
      const input = {};
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty displayName', () => {
      const input = { displayName: '' };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects displayName over 100 chars', () => {
      const input = { displayName: 'a'.repeat(101) };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid avatarUrl', () => {
      const input = { avatarUrl: 'not-a-url' };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('privacySettingsSchema', () => {
    it('validates complete privacy settings with presence sharing set to everyone', () => {
      const input = {
        presenceEnabled: true,
        presenceSharing: 'everyone',
        readReceiptsEnabled: true,
      };
      const result = privacySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates complete privacy settings with presence sharing set to contacts', () => {
      const input = {
        presenceEnabled: true,
        presenceSharing: 'contacts',
        readReceiptsEnabled: true,
      };
      const result = privacySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates complete privacy settings with presence sharing set to nobody', () => {
      const input = {
        presenceEnabled: false,
        presenceSharing: 'nobody',
        readReceiptsEnabled: false,
      };
      const result = privacySettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid privacy setting', () => {
      const input = {
        presenceEnabled: true,
        presenceSharing: 'invalid',
        readReceiptsEnabled: true,
      };
      const result = privacySettingsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
