import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { PresenceStatus } from '@chat/shared';

type RedisClient = ReturnType<typeof createClient>;

const PRESENCE_TTL_SECONDS = 30;
const OFFLINE_GRACE_MS = 5_000;

@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private redisClient: RedisClient | null = null;
  private offlineTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private memoryPresence = new Map<string, { status: PresenceStatus; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const client = createClient({ url: redisUrl });
      client.on('error', (error) => {
        this.logger.warn(`Redis unavailable for presence: ${error.message}`);
      });
      client
        .connect()
        .then(() => {
          this.redisClient = client;
          this.logger.log('PresenceService connected to Redis');
        })
        .catch((error: Error) => {
          this.logger.warn(`PresenceService falling back to in-memory presence store: ${error.message}`);
        });
    } else {
      this.logger.warn('REDIS_URL not configured. Using in-memory presence store.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.offlineTimers.forEach((timer) => clearTimeout(timer));
    this.offlineTimers.clear();
    await this.redisClient?.disconnect();
  }

  async refreshHeartbeat(userId: string, status: PresenceStatus): Promise<void> {
    this.clearOfflineTimer(userId);
    const key = this.presenceKey(userId);
    const value = JSON.stringify({
      status,
      lastSeen: new Date().toISOString(),
    });

    if (this.redisClient) {
      await this.redisClient.set(key, value, { EX: PRESENCE_TTL_SECONDS });
      return;
    }

    this.memoryPresence.set(userId, {
      status,
      expiresAt: Date.now() + PRESENCE_TTL_SECONDS * 1000,
    });
  }

  scheduleOffline(userId: string, onOffline: () => void): void {
    this.clearOfflineTimer(userId);

    const timer = setTimeout(async () => {
      const isOnline = await this.isOnline(userId);
      if (isOnline) {
        return;
      }
      onOffline();
    }, OFFLINE_GRACE_MS);

    this.offlineTimers.set(userId, timer);
  }

  private clearOfflineTimer(userId: string): void {
    const timer = this.offlineTimers.get(userId);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.offlineTimers.delete(userId);
  }

  private async isOnline(userId: string): Promise<boolean> {
    if (this.redisClient) {
      const value = await this.redisClient.get(this.presenceKey(userId));
      return Boolean(value);
    }

    const state = this.memoryPresence.get(userId);
    return Boolean(state && state.expiresAt > Date.now());
  }

  private presenceKey(userId: string): string {
    return `presence:${userId}`;
  }
}
