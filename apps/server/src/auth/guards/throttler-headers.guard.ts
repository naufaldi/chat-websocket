import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom ThrottlerGuard that adds X-RateLimit-* headers
 * to comply with standard rate limiting header conventions.
 */
@Injectable()
export class ThrottlerWithHeadersGuard extends ThrottlerGuard {
  private readonly limit = 5;
  private readonly ttl = 900000; // 15 minutes in milliseconds
  private readonly blockDuration = 900000; // 15 minutes block duration

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req, res } = this.getRequestResponse(context);

    // Get the tracker (IP address)
    const tracker = await this.getTracker(req);

    // Generate the key for this request
    const key = this.generateKey(context, tracker, 'short');

    // Increment the counter and get the result
    const record = await this.storageService.increment(key, this.ttl, this.limit, this.blockDuration, 'short');

    // Calculate remaining attempts
    const remaining = Math.max(0, this.limit - (record.totalHits || 0));

    // Set the standard X-RateLimit-* headers
    res.set({
      'X-RateLimit-Limit': this.limit,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': record.timeToExpire,
    });

    // Check if blocked (totalHits > limit means we exceeded the limit)
    if (record.isBlocked || record.totalHits > this.limit) {
      res.set('Retry-After', record.timeToBlockExpire || this.ttl / 1000);
      throw new ThrottlerException('Too Many Requests');
    }

    return true;
  }
}
