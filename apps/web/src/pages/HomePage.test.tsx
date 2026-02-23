import { describe, expect, it } from 'vitest';

describe('HomePage', () => {
  it('page component is exported correctly', async () => {
    const { HomePage } = await import('./HomePage');
    expect(HomePage).toBeDefined();
    expect(typeof HomePage).toBe('function');
  });
});
