import { describe, expect, it } from 'vitest';

describe('useOptimisticMessages', () => {
  it('hook is exported correctly', async () => {
    const { useOptimisticMessages } = await import('./useOptimisticMessages');
    expect(useOptimisticMessages).toBeDefined();
    expect(typeof useOptimisticMessages).toBe('function');
  });
});
