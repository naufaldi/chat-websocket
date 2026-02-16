import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/database.service';
import { messages } from '@chat/db';
import type { SendMessageInput } from '@chat/shared';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'file';
  clientMessageId: string | null;
  status: 'sending' | 'delivered' | 'read' | 'error';
  replyToId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

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
     
    _cursor?: string
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt)
      ))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit);
  }

  async findByClientMessageId(clientMessageId: string): Promise<Message | null> {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.clientMessageId, clientMessageId))
      .limit(1);
    return message || null;
  }

  async create(data: SendMessageInput & { senderId: string }): Promise<Message> {
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

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, id));
  }
}
