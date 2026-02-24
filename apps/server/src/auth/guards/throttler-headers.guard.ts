import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerException, ThrottlerStorage, ThrottlerModuleOptions } from '@nestjs/throttler';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { Reflector } from '@nestjs/core';

// === Types (Immutable data structures) ===

export interface ThrottlerConfig {
  readonly ttl: number;
  readonly limit: number;
}

export interface RateLimitRecord {
  readonly totalHits: number;
  readonly isBlocked: boolean;
  readonly timeToExpire: number;
  readonly timeToBlockExpire: number;
}

export interface RateLimitHeaders {
  readonly 'X-RateLimit-Limit': number;
  readonly 'X-RateLimit-Remaining': number;
  readonly 'X-RateLimit-Reset': number;
}

// === Pure Functions (No side effects, no mutations) ===

/**
 * Pure function: Get throttler config from immutable map
 * Same input always produces same output
 */
export const getThrottlerConfig = (
  configMap: Readonly<Record<string, ThrottlerConfig>>,
  name: string
): ThrottlerConfig =>
  configMap[name] ?? { ttl: 900000, limit: 5 };

/**
 * Pure function: Calculate remaining requests
 */
export const calculateRemaining = (limit: number, totalHits: number): number =>
  Math.max(0, limit - totalHits);

/**
 * Pure function: Build rate limit headers from config and record
 * Uses function composition internally
 */
export const buildRateLimitHeaders = (
  config: ThrottlerConfig,
  record: RateLimitRecord
): RateLimitHeaders => ({
  'X-RateLimit-Limit': config.limit,
  'X-RateLimit-Remaining': calculateRemaining(config.limit, record.totalHits),
  'X-RateLimit-Reset': record.timeToExpire,
});

/**
 * Pure function: Calculate retry-after header value
 */
export const calculateRetryAfter = (
  record: RateLimitRecord,
  ttl: number
): number =>
  record.timeToBlockExpire || Math.ceil(ttl / 1000);

/**
 * Pure function: Check if request is blocked
 */
export const isRequestBlocked = (
  record: RateLimitRecord,
  limit: number
): boolean =>
  record.isBlocked || record.totalHits > limit;

// === Guard Class (System boundary - handles side effects) ===

@Injectable()
export class ThrottlerWithHeadersGuard extends ThrottlerGuard {
  // Lazy-loaded immutable config map
  private readonly configMap: Readonly<Record<string, ThrottlerConfig>>;

  constructor(
    @Inject(THROTTLER_OPTIONS) options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage) storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(options, storage, reflector);

    // Build immutable config map from ConfigService (one-time side effect at construction)
    this.configMap = Object.freeze({
      short: this.configService.get<ThrottlerConfig>('throttler.short') ?? { ttl: 900000, limit: 5 },
      default: this.configService.get<ThrottlerConfig>('throttler.default') ?? { ttl: 60000, limit: 100 },
      search: this.configService.get<ThrottlerConfig>('throttler.search') ?? { ttl: 60000, limit: 10 },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get throttler name from metadata
    const throttlerName = this.reflector.get<string>('throttler:name', context.getHandler()) || 'short';

    // Pure function: Get config dynamically
    const config = getThrottlerConfig(this.configMap, throttlerName);
    const blockDuration = config.ttl;

    // System boundary: Extract request/response (side effects begin here)
    const { req, res } = this.getRequestResponse(context);
    const tracker = await this.getTracker(req);
    const key = this.generateKey(context, tracker, throttlerName);

    // System boundary: Storage interaction (external state)
    const record = await this.storageService.increment(
      key,
      config.ttl,
      config.limit,
      blockDuration,
      throttlerName
    );

    // Pure function: Build headers
    const headers = buildRateLimitHeaders(config, record as RateLimitRecord);

    // System boundary: Response mutation (necessary side effect)
    res.set(headers);

    // Pure function: Check if blocked
    if (isRequestBlocked(record as RateLimitRecord, config.limit)) {
      const retryAfter = calculateRetryAfter(record as RateLimitRecord, config.ttl);
      res.set('Retry-After', retryAfter);
      throw new ThrottlerException('Too Many Requests');
    }

    return true;
  }
}
