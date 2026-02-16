import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import { conversations, conversationParticipants } from '@chat/db';
import type { CreateConversationInput } from '@chat/shared';

@Injectable()
export class ConversationsRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async findById(id: string) {
    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return conversation || null;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async findByUser(userId: string, limit = 20) {
    const participantRows = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversationIds = participantRows.map((p: any) => p.conversationId);

    if (conversationIds.length === 0) return [];

    return this.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async create(data: CreateConversationInput, createdBy: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.db.transaction(async (tx: any) => {
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
          role: userId === createdBy ? 'owner' : 'member',
        }))
      );

      return conversation;
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async isUserParticipant(conversationId: string, userId: string) {
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
}
