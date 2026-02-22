import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { readReceipts, conversationParticipants, messages, conversations, users } from '@chat/db';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class ReadReceiptsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Mark messages as read for a user
   * - 1:1 chats: Instant DB write + real-time notification
   * - Group chats: Redis counter + batch flush every 10s
   */
  async markAsRead(userId: string, conversationId: string, messageId: string): Promise<void> {
    // Verify user is participant
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Check if already read
    const [existing] = await this.db
      .select()
      .from(readReceipts)
      .where(
        and(
          eq(readReceipts.messageId, messageId),
          eq(readReceipts.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return; // Already read
    }

    // Insert read receipt
    await this.db.insert(readReceipts).values({
      messageId,
      userId,
    });

    // Update participant's last read
    await this.db
      .update(conversationParticipants)
      .set({
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  /**
   * Get read receipts for a message
   */
  async getReceiptsForMessage(messageId: string, requesterId: string) {
    // Verify message exists
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Verify requester is participant
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, message.conversationId),
          eq(conversationParticipants.userId, requesterId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Get receipts with user info
    const receipts = await this.db
      .select({
        messageId: readReceipts.messageId,
        userId: readReceipts.userId,
        readAt: readReceipts.readAt,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        lastSeenAt: users.lastSeenAt,
      })
      .from(readReceipts)
      .innerJoin(users, eq(readReceipts.userId, users.id))
      .where(eq(readReceipts.messageId, messageId))
      .orderBy(desc(readReceipts.readAt));

    // Get total participants count
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, message.conversationId));

    return {
      receipts: receipts.map((r) => ({
        messageId: r.messageId,
        userId: r.userId,
        user: {
          id: r.userId,
          username: r.username,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
        },
        readAt: r.readAt.toISOString(),
      })),
      totalCount: countResult?.count ?? 0,
      readCount: receipts.length,
    };
  }

  /**
   * Get unread count for a conversation
   */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant || !participant.lastReadMessageId) {
      // User hasn't read any messages - return total count
      const [countResult] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));
      return countResult?.count ?? 0;
    }

    // Count messages after last read
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${participant.lastReadMessageId})`
        )
      );

    return countResult?.count ?? 0;
  }
}
