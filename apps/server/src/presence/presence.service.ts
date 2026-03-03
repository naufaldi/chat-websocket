import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { users } from '@chat/db';
import { eq } from 'drizzle-orm';
import { FriendsRepository } from '../friends/friends.repository';

type UserPresenceResult = {
  userId: string;
  status: 'online' | 'offline';
  lastActivity: string | null;
  lastSeenAt: string | null;
};

const toHiddenPresence = (id: string): UserPresenceResult => ({
  userId: id,
  status: 'offline' as const,
  lastActivity: null,
  lastSeenAt: null,
});

@Injectable()
export class PresenceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly friendsRepository: FriendsRepository,
  ) {}

  /**
   * Get user presence status
   * Respects privacy settings
   */
  async getUserPresence(userId: string, requesterId: string): Promise<UserPresenceResult> {
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
      return toHiddenPresence(user.id);
    }

    // Check sharing setting
    if (user.presenceSharing === 'nobody') {
      return toHiddenPresence(user.id);
    }

    if (user.presenceSharing === 'contacts' && userId !== requesterId) {
      const isContact = await this.friendsRepository.areContacts(userId, requesterId);

      if (!isContact) {
        return toHiddenPresence(user.id);
      }
    }

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
