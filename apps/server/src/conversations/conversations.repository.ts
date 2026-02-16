import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { conversations, conversationParticipants } from '@chat/db';
import type { CreateConversationInput } from '@chat/shared';

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
      .where(eq(conversations.id, id))
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
      .where(inArray(conversations.id, conversationIds))
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
}
