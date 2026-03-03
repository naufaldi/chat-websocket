import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

interface BlacklistedToken {
  expiresAt: number;
}

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly redisPrefix = 'token_blacklist:';
  private readonly blacklist = new Map<string, BlacklistedToken>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;
  private redisClient: RedisClient | null = null;
  private redisAvailable = false;
  private readonly redisInitPromise: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    // Clean up expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    this.redisInitPromise = this.initializeRedis().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis unavailable for token blacklist, using in-memory fallback: ${message}`);
    });
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured. Token blacklist using in-memory fallback.');
      return;
    }

    const client = createClient({ url: redisUrl });

    client.on('error', (error) => {
      this.redisAvailable = false;
      this.logger.warn(`Token blacklist Redis error: ${error.message}`);
    });

    await client.connect();
    this.redisClient = client;
    this.redisAvailable = true;
  }

  /**
   * Add a token to the blacklist
   * @param tokenId - The unique ID of the token (jti claim)
   * @param expiresAt - Unix timestamp when the token naturally expires (in milliseconds)
   */
  async add(tokenId: string, expiresAt: number): Promise<void> {
    await this.redisInitPromise;

    const ttlSeconds = Math.ceil((expiresAt - Date.now()) / 1000);

    if (ttlSeconds <= 0) {
      return;
    }

    const redisKey = `${this.redisPrefix}${tokenId}`;
    this.blacklist.set(tokenId, { expiresAt });

    if (this.redisClient && this.redisAvailable) {
      try {
        await this.redisClient.set(redisKey, '1', { EX: ttlSeconds });
        return;
      } catch (error) {
        this.redisAvailable = false;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to write token blacklist to Redis: ${message}`);
      }
    }

  }

  /**
   * Check if a token is blacklisted
   * @param tokenId - The unique ID of the token
   * @returns true if the token is blacklisted
   */
  async isBlacklisted(tokenId: string): Promise<boolean> {
    await this.redisInitPromise;

    const redisKey = `${this.redisPrefix}${tokenId}`;

    if (this.redisClient && this.redisAvailable) {
      try {
        const value = await this.redisClient.get(redisKey);
        return value !== null;
      } catch (error) {
        this.redisAvailable = false;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to read token blacklist from Redis: ${message}`);
      }
    }

    const entry = this.blacklist.get(tokenId);
    if (!entry) {
      return false;
    }

    // Check if the token has naturally expired
    if (Date.now() > entry.expiresAt) {
      this.blacklist.delete(tokenId);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired entries from the blacklist
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [tokenId, entry] of this.blacklist.entries()) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(tokenId);
      }
    }
  }

  /**
   * Clean up on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redisClient && this.redisAvailable) {
      this.redisClient.quit().catch(() => {
        this.logger.warn('Failed to close token blacklist Redis client');
      });
    }
  }
}
