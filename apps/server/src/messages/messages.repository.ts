import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, isNull, lt, or } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { messages, type Message } from '@chat/db';
import type { SendMessageInput } from '@chat/shared';

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Message | null> {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return message || null;
  }

  async findByConversation(
    conversationId: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
    const baseWhere = and(
      eq(messages.conversationId, conversationId),
      isNull(messages.deletedAt),
    );

    let query = this.db
      .select()
      .from(messages)
      .where(baseWhere)
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    if (cursor) {
      try {
        const decoded: { createdAt: string; id: string } = JSON.parse(
          Buffer.from(cursor, 'base64url').toString(),
        );
        const cursorDate = new Date(decoded.createdAt);
        const cursorId = decoded.id;

        query = query.where(
          and(
            baseWhere,
            or(
              lt(messages.createdAt, cursorDate),
              and(
                eq(messages.createdAt, cursorDate),
                lt(messages.id, cursorId),
              ),
            ),
          ),
        ) as typeof query;
      } catch {
        // Invalid cursor, ignore and return from beginning
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
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        }),
      ).toString('base64url');
    }

    return { messages: items, nextCursor, hasMore };
  }

  async findByClientMessageId(clientMessageId: string): Promise<Message | null> {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.clientMessageId, clientMessageId))
      .limit(1);
    return message || null;
  }

  async create(
    data: SendMessageInput & { senderId: string },
    tx?: DrizzleDB,
  ): Promise<Message> {
    const db = tx || this.db;
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        contentType: data.contentType,
        clientMessageId: data.clientMessageId,
        replyToId: data.replyToId || null,
      })
      .returning();
    return message;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, id));
  }
}
