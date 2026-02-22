import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { users } from '@chat/db';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class PresenceService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Get user presence status
   * Respects privacy settings
   */
  async getUserPresence(userId: string, requesterId: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        lastSeenAt: users.lastSeenAt,
        presenceEnabled: users.presenceEnabled,
        presenceSharing: users.presenceSharing,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Check privacy settings
    if (!user.presenceEnabled) {
      // User has presence disabled - return offline
      return {
        userId: user.id,
        status: 'offline' as const,
        lastActivity: null,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      };
    }

    // Check sharing setting
    if (user.presenceSharing === 'nobody') {
      // Only return offline status
      return {
        userId: user.id,
        status: 'offline' as const,
        lastActivity: null,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      };
    }

    // For 'friends' - in a real implementation, would check friendship
    // For now, we'll return the actual presence
    // TODO: Check friendship when 'friends' option is used

    // Return actual presence (would come from Redis in production)
    return {
      userId: user.id,
      status: 'online' as const, // Would check Redis for actual status
      lastActivity: new Date().toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, userId));
  }
}
