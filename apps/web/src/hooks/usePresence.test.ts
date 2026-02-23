import { describe, expect, it } from 'vitest';

describe('usePresence', () => {
  it('hook is exported correctly', async () => {
    const { usePresence } = await import('./usePresence');
    expect(usePresence).toBeDefined();
    expect(typeof usePresence).toBe('function');
  });
});

describe('useUserPresence', () => {
  it('hook is exported correctly', async () => {
    const { useUserPresence } = await import('./usePresence');
    expect(useUserPresence).toBeDefined();
    expect(typeof useUserPresence).toBe('function');
  });
});
