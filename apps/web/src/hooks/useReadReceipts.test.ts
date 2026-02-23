import { describe, expect, it } from 'vitest';

describe('useReadReceipts', () => {
  it('hook is exported correctly', async () => {
    const { useReadReceipts } = await import('./useReadReceipts');
    expect(useReadReceipts).toBeDefined();
    expect(typeof useReadReceipts).toBe('function');
  });
});

describe('useMarkAsRead', () => {
  it('hook is exported correctly', async () => {
    const { useMarkAsRead } = await import('./useReadReceipts');
    expect(useMarkAsRead).toBeDefined();
    expect(typeof useMarkAsRead).toBe('function');
  });
});
