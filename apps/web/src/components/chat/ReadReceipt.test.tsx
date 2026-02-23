import { describe, expect, it } from 'vitest';

describe('ReadReceipt', () => {
  it('component is exported correctly', async () => {
    const { ReadReceipt } = await import('./ReadReceipt');
    expect(ReadReceipt).toBeDefined();
    expect(typeof ReadReceipt).toBe('function');
  });
});

describe('ReadReceiptDetails', () => {
  it('component is exported correctly', async () => {
    const { ReadReceiptDetails } = await import('./ReadReceipt');
    expect(ReadReceiptDetails).toBeDefined();
    expect(typeof ReadReceiptDetails).toBe('function');
  });
});

describe('ReadReceiptCount', () => {
  it('component is exported correctly', async () => {
    const { ReadReceiptCount } = await import('./ReadReceipt');
    expect(ReadReceiptCount).toBeDefined();
    expect(typeof ReadReceiptCount).toBe('function');
  });
});
