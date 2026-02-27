import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { conversations, conversationParticipants, users, messages } from '@chat/db';
import type { CreateConversationInput } from '@chat/shared';

interface CursorData {
  createdAt: string;
  id: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ParticipantRow {
  conversationId: string;
}

@Injectable()
export class ConversationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Conversation | null> {
    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), isNull(conversations.deletedAt)))
      .limit(1);
    return conversation || null;
  }

  async findByUser(userId: string, limit = 20): Promise<Conversation[]> {
    const participantRows: ParticipantRow[] = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = participantRows.map((p) => p.conversationId);

    if (conversationIds.length === 0) return [];

    return this.db
      .select()
      .from(conversations)
      .where(and(inArray(conversations.id, conversationIds), isNull(conversations.deletedAt)))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  }

  async create(data: CreateConversationInput, createdBy: string): Promise<Conversation> {
    return this.db.transaction(async (tx: DrizzleDB) => {
      const [conversation] = await tx
        .insert(conversations)
        .values({
          type: data.type,
          title: data.title || null,
          createdBy,
        })
        .returning();

      await tx.insert(conversationParticipants).values(
        data.participantIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: userId === createdBy ? 'owner' : 'member' as const,
        }))
      );

      return conversation;
    });
  }

  async isUserParticipant(conversationId: string, userId: string): Promise<boolean> {
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ))
      .limit(1);
    return !!participant;
  }

  async findByUserPaginated(
    userId: string,
    cursor: string | undefined,
    limit: number = 50,
  ): Promise<{ conversations: Conversation[]; nextCursor: string | null }> {
    // Get user's conversation IDs
    const participantRows = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = participantRows.map((p) => p.conversationId);
    if (conversationIds.length === 0) {
      return { conversations: [], nextCursor: null };
    }

    const baseWhere = and(
      inArray(conversations.id, conversationIds),
      isNull(conversations.deletedAt)
    );

    let query = this.db
      .select()
      .from(conversations)
      .where(baseWhere)
      .orderBy(desc(conversations.updatedAt), desc(conversations.id))
      .limit(limit + 1);

    if (cursor) {
      try {
        const decoded: CursorData = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        const cursorDate = new Date(decoded.createdAt);
        const cursorId = decoded.id;

        query = query.where(
          and(
            baseWhere,
            or(
              lt(conversations.updatedAt, cursorDate),
              and(
                eq(conversations.updatedAt, cursorDate),
                lt(conversations.id, cursorId)
              )
            )
          )
        ) as typeof query;
      } catch {
        // Invalid cursor, ignore
      }
    }

    const results = await query;
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          createdAt: lastItem.updatedAt.toISOString(),
          id: lastItem.id,
        })
      ).toString('base64url');
    }

    return { conversations: items, nextCursor };
  }

  async findParticipants(conversationId: string): Promise<Array<{
    id: string;
    conversationId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: Date;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    lastSeenAt: Date | null;
  }>> {
    return this.db
      .select({
        id: conversationParticipants.id,
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        role: conversationParticipants.role,
        joinedAt: conversationParticipants.joinedAt,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        lastSeenAt: users.lastSeenAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, conversationId));
  }

  async softDelete(conversationId: string): Promise<void> {
    await this.db
      .update(conversations)
      .set({ deletedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  async joinConversation(
    conversationId: string,
    userId: string,
    role: 'member' | 'admin' = 'member',
  ): Promise<void> {
    await this.db.insert(conversationParticipants).values({
      conversationId,
      userId,
      role,
    });
  }

  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    await this.db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  async getParticipantCount(conversationId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
    return result[0]?.count ?? 0;
  }

  async getLastMessage(conversationId: string): Promise<{ id: string; content: string; senderId: string; createdAt: Date } | null> {
    const [message] = await this.db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    return message || null;
  }
}
