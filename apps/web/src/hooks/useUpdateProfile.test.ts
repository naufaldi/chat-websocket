import { describe, expect, it } from 'vitest';

describe('useUpdateProfile', () => {
  it('hook is exported correctly', async () => {
    const { useUpdateProfile } = await import('./useUpdateProfile');
    expect(useUpdateProfile).toBeDefined();
    expect(typeof useUpdateProfile).toBe('function');
  });
});

describe('usePrivacySettings', () => {
  it('hook is exported correctly', async () => {
    const { usePrivacySettings } = await import('./useUpdateProfile');
    expect(usePrivacySettings).toBeDefined();
    expect(typeof usePrivacySettings).toBe('function');
  });
});

describe('useUpdatePrivacy', () => {
  it('hook is exported correctly', async () => {
    const { useUpdatePrivacy } = await import('./useUpdateProfile');
    expect(useUpdatePrivacy).toBeDefined();
    expect(typeof useUpdatePrivacy).toBe('function');
  });
});
