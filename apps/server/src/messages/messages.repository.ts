import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { messages } from '@chat/db';
import type { SendMessageInput } from '@chat/shared';

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findById(id: string) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return message || null;
  }

  async findByConversation(conversationId: string, limit = 50, _cursor?: string) {
    let query = this.db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt)
      ))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit);

    return query;
  }

  async findByClientMessageId(clientMessageId: string) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.clientMessageId, clientMessageId))
      .limit(1);
    return message || null;
  }

  async create(data: SendMessageInput & { senderId: string }) {
    const [message] = await this.db
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

  async softDelete(id: string) {
    await this.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, id));
  }
}
