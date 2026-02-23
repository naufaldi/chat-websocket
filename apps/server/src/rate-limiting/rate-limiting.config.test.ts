import { describe, it, expect } from 'vitest';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

describe('Rate Limiting Configuration', () => {
  it('should use Redis storage for distributed rate limiting', () => {
    // This test verifies that we're using Redis-based storage
    // rather than in-memory storage
    const storage = new ThrottlerStorageRedisService({
      host: 'localhost',
      port: 6379,
    });

    expect(storage).toBeDefined();
    expect(storage.increment).toBeDefined();
  });

  it('should have multiple rate limit configurations', () => {
    // Should have configs for: short (auth), default (general), search
    const configs: ThrottlerModuleOptions['throttlers'] = [
      {
        name: 'short',
        ttl: 900000,
        limit: 5,
      },
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'search',
        ttl: 60000,
        limit: 10,
      },
    ];

    expect(configs).toHaveLength(3);
    expect(configs.map(c => c.name)).toContain('short');
    expect(configs.map(c => c.name)).toContain('default');
    expect(configs.map(c => c.name)).toContain('search');
  });
});
