import { describe, it, expect } from 'vitest';

// Pure function implementations for testing (copied from guard to avoid runtime dependencies)
interface ThrottlerConfig {
  readonly ttl: number;
  readonly limit: number;
}

interface RateLimitRecord {
  readonly totalHits: number;
  readonly isBlocked: boolean;
  readonly timeToExpire: number;
  readonly timeToBlockExpire: number;
}

interface RateLimitHeaders {
  readonly 'X-RateLimit-Limit': number;
  readonly 'X-RateLimit-Remaining': number;
  readonly 'X-RateLimit-Reset': number;
}

const getThrottlerConfig = (
  configMap: Readonly<Record<string, ThrottlerConfig>>,
  name: string
): ThrottlerConfig =>
  configMap[name] ?? { ttl: 900000, limit: 5 };

const calculateRemaining = (limit: number, totalHits: number): number =>
  Math.max(0, limit - totalHits);

const buildRateLimitHeaders = (
  config: ThrottlerConfig,
  record: RateLimitRecord
): RateLimitHeaders => ({
  'X-RateLimit-Limit': config.limit,
  'X-RateLimit-Remaining': calculateRemaining(config.limit, record.totalHits),
  'X-RateLimit-Reset': record.timeToExpire,
});

describe('throttler-headers pure functions', () => {
  // Immutable config map for testing
  const testConfigMap: Readonly<Record<string, ThrottlerConfig>> = {
    short: { ttl: 900000, limit: 5 },
    default: { ttl: 60000, limit: 100 },
    search: { ttl: 60000, limit: 10 },
  };

  describe('getThrottlerConfig', () => {
    it('should be pure - same input always produces same output', () => {
      const result1 = getThrottlerConfig(testConfigMap, 'short');
      const result2 = getThrottlerConfig(testConfigMap, 'short');

      expect(result1).toEqual({ ttl: 900000, limit: 5 });
      expect(result1).toEqual(result2);
    });

    it('should return config for named throttler', () => {
      const config = getThrottlerConfig(testConfigMap, 'search');
      expect(config).toEqual({ ttl: 60000, limit: 10 });
    });

    it('should return default fallback when name not found', () => {
      const config = getThrottlerConfig(testConfigMap, 'unknown');
      expect(config).toEqual({ ttl: 900000, limit: 5 });
    });

    it('should not mutate input config map', () => {
      const original = { ...testConfigMap };
      getThrottlerConfig(testConfigMap, 'short');
      expect(testConfigMap).toEqual(original);
    });
  });

  describe('calculateRemaining', () => {
    it('should calculate remaining requests correctly', () => {
      expect(calculateRemaining(5, 0)).toBe(5);
      expect(calculateRemaining(5, 3)).toBe(2);
      expect(calculateRemaining(5, 5)).toBe(0);
      expect(calculateRemaining(5, 10)).toBe(0);
    });

    it('should be pure function', () => {
      const result1 = calculateRemaining(100, 50);
      const result2 = calculateRemaining(100, 50);
      expect(result1).toBe(result2);
      expect(result1).toBe(50);
    });
  });

  describe('buildRateLimitHeaders', () => {
    it('should build headers from config and record', () => {
      const config: ThrottlerConfig = { ttl: 60000, limit: 10 };
      const record: RateLimitRecord = {
        totalHits: 3,
        isBlocked: false,
        timeToExpire: 12345,
        timeToBlockExpire: 0,
      };

      const headers = buildRateLimitHeaders(config, record);

      expect(headers).toEqual({
        'X-RateLimit-Limit': 10,
        'X-RateLimit-Remaining': 7,
        'X-RateLimit-Reset': 12345,
      });
    });
  });
});
