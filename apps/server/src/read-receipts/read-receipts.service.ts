import { Injectable, NotFoundException, ForbiddenException, Logger, OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { readReceipts, conversationParticipants, messages, users } from '@chat/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ConversationsRepository } from '../conversations/conversations.repository';

type RedisClient = ReturnType<typeof createClient>;

const BATCH_INTERVAL_MS = 10_000;
const GROUP_THRESHOLD = 10;

interface PendingReceipt {
  messageId: string;
  userId: string;
  conversationId: string;
  readAt: string;
}

@Injectable()
export class ReadReceiptsService implements OnModuleDestroy {
  private readonly logger = new Logger(ReadReceiptsService.name);
  private redisClient: RedisClient | null = null;
  private inMemoryQueue: PendingReceipt[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
    private readonly conversationsRepository: ConversationsRepository,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const client = createClient({ url: redisUrl });
      client.on('error', (error) => {
        this.logger.warn(`Redis unavailable for read receipts: ${error.message}`);
      });
      client
        .connect()
        .then(() => {
          this.redisClient = client;
          this.logger.log('ReadReceiptsService connected to Redis');
          this.startBatchWorker();
        })
        .catch((error: Error) => {
          this.logger.warn(`ReadReceiptsService falling back to in-memory queue: ${error.message}`);
          this.startBatchWorker();
        });
    } else {
      this.logger.warn('REDIS_URL not configured. Using in-memory queue for read receipts.');
      this.startBatchWorker();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    await this.flushPendingReceipts();
    await this.redisClient?.disconnect();
  }

  private startBatchWorker(): void {
    this.batchTimer = setInterval(() => {
      this.flushPendingReceipts().catch((error) => {
        this.logger.error(`Failed to flush pending receipts: ${error.message}`);
      });
    }, BATCH_INTERVAL_MS);
  }

  /**
   * Get participant count for a conversation
   */
  private async getParticipantCount(conversationId: string): Promise<number> {
    return this.conversationsRepository.getParticipantCount(conversationId);
  }

  /**
   * Queue a read receipt for batch processing (group chats)
   */
  private async queueReceipt(receipt: PendingReceipt): Promise<void> {
    if (this.redisClient) {
      // Add to Redis queue
      const queueKey = 'read_receipts:pending';
      await this.redisClient.lPush(queueKey, JSON.stringify(receipt));
      // Increment counter for this message
      const counterKey = `read_count:${receipt.conversationId}:${receipt.messageId}`;
      await this.redisClient.incr(counterKey);
      await this.redisClient.expire(counterKey, 300); // 5 min TTL
    } else {
      // Use in-memory queue
      this.inMemoryQueue.push(receipt);
    }
  }

  /**
   * Flush pending receipts to database
   */
  private async flushPendingReceipts(): Promise<void> {
    if (this.redisClient) {
      // Get all pending receipts from Redis
      const queueKey = 'read_receipts:pending';
      const batch = await this.redisClient.lRange(queueKey, 0, -1);
      if (batch.length === 0) return;

      // Clear the queue
      await this.redisClient.del(queueKey);

      // Parse and deduplicate receipts
      const receipts = batch
        .map((item) => JSON.parse(item.toString()) as PendingReceipt)
        .filter((r, index, self) =>
          index === self.findIndex((t) => t.messageId === r.messageId && t.userId === r.userId)
        );

      await this.processReceiptBatch(receipts);
    } else if (this.inMemoryQueue.length > 0) {
      // Process in-memory queue
      const receipts = this.inMemoryQueue.splice(0, this.inMemoryQueue.length);
      // Deduplicate
      const unique = receipts.filter((r, index, self) =>
        index === self.findIndex((t) => t.messageId === r.messageId && t.userId === r.userId)
      );
      await this.processReceiptBatch(unique);
    }
  }

  /**
   * Process a batch of receipts (insert to DB and update last read)
   */
  private async processReceiptBatch(receipts: PendingReceipt[]): Promise<void> {
    if (receipts.length === 0) return;

    // Group by conversation for last_read update
    const byConversation = new Map<string, Map<string, PendingReceipt>>();
    for (const receipt of receipts) {
      if (!byConversation.has(receipt.conversationId)) {
        byConversation.set(receipt.conversationId, new Map());
      }
      byConversation.get(receipt.conversationId)!.set(receipt.userId, receipt);
    }

    // Insert read receipts (skip duplicates)
    for (const receipt of receipts) {
      try {
        await this.db.insert(readReceipts).values({
          messageId: receipt.messageId,
          userId: receipt.userId,
          readAt: new Date(receipt.readAt),
        });
      } catch {
        // Skip duplicates
      }
    }

    // Update last_read for each participant
    for (const [conversationId, userMap] of byConversation) {
      for (const [userId, receipt] of userMap) {
        await this.db
          .update(conversationParticipants)
          .set({
            lastReadMessageId: receipt.messageId,
            lastReadAt: new Date(receipt.readAt),
          })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId)
            )
          );
      }
    }

    this.logger.log(`Flushed ${receipts.length} read receipts to database`);
  }

  /**
   * Get current read count from Redis for a message (group chats)
   */
  async getRedisReadCount(conversationId: string, messageId: string): Promise<number> {
    if (!this.redisClient) return 0;
    const counterKey = `read_count:${conversationId}:${messageId}`;
    const count = await this.redisClient.get(counterKey);
    return count ? parseInt(count.toString(), 10) : 0;
  }

  /**
   * Mark messages as read for a user
   * - 1:1 chats: Instant DB write + real-time notification
   * - Group chats (10+): Redis counter + batch flush every 10s
   */
  async markAsRead(userId: string, conversationId: string, messageId: string, useBatching = true): Promise<{ isBatched: boolean }> {
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
      return { isBatched: false }; // Already read
    }

    // Determine if this is a group chat that should use batching
    const participantCount = await this.getParticipantCount(conversationId);
    const shouldBatch = useBatching && participantCount >= GROUP_THRESHOLD;

    if (shouldBatch) {
      // Queue for batch processing
      await this.queueReceipt({
        messageId,
        userId,
        conversationId,
        readAt: new Date().toISOString(),
      });
      this.logger.debug(`Queued receipt for batch: message=${messageId}, user=${userId}`);
      return { isBatched: true };
    }

    // 1:1 or small group - instant DB write
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

    return { isBatched: false };
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
