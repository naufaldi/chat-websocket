import { describe, expect, it } from 'vitest';

describe('usersApi', () => {
  it('has updateProfile method', async () => {
    const { usersApi } = await import('./api');
    expect(usersApi.updateProfile).toBeDefined();
    expect(typeof usersApi.updateProfile).toBe('function');
  });

  it('has updatePrivacy method', async () => {
    const { usersApi } = await import('./api');
    expect(usersApi.updatePrivacy).toBeDefined();
    expect(typeof usersApi.updatePrivacy).toBe('function');
  });
});
