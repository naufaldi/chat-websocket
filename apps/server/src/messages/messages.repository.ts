import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import { messages } from '@chat/db';
import type { SendMessageInput } from '@chat/shared';

@Injectable()
export class MessagesRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async findById(id: string) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return message || null;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, no-unused-vars
  async findByConversation(conversationId: string, limit = 50, _cursor?: string) {
    const query = this.db
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async findByClientMessageId(clientMessageId: string) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.clientMessageId, clientMessageId))
      .limit(1);
    return message || null;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async softDelete(id: string) {
    await this.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, id));
  }
}
