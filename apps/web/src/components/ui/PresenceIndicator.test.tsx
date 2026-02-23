import { describe, expect, it } from 'vitest';

describe('PresenceIndicator', () => {
  it('component is exported correctly', async () => {
    const { PresenceIndicator } = await import('./PresenceIndicator');
    expect(PresenceIndicator).toBeDefined();
    expect(typeof PresenceIndicator).toBe('function');
  });
});

describe('PresenceText', () => {
  it('component is exported correctly', async () => {
    const { PresenceText } = await import('./PresenceIndicator');
    expect(PresenceText).toBeDefined();
    expect(typeof PresenceText).toBe('function');
  });
});
