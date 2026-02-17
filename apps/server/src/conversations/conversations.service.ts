import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import type { CreateConversationInput } from '@chat/shared';
import { userPublicSchema } from '@chat/shared';

interface ParticipantWithUser {
  id: string;
  conversationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
}

@Injectable()
export class ConversationsService {
  constructor(private readonly repository: ConversationsRepository) {}

  async findAllByUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ) {
    const { conversations, nextCursor } = await this.repository.findByUserPaginated(
      userId,
      cursor,
      limit,
    );

    // Get participants and last messages for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await this.repository.findParticipants(conv.id);
        const lastMessage = await this.repository.getLastMessage(conv.id);
        const participantCount = await this.repository.getParticipantCount(conv.id);

        return {
          ...conv,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
          participants: participants.map((p) => ({
            user: {
              id: p.userId,
              username: p.username,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
            },
            role: p.role,
          })),
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt.toISOString(),
              }
            : null,
          participantCount,
          unreadCount: 0, // TODO: Implement unread count
        };
      })
    );

    return {
      data: {
        conversations: conversationsWithDetails,
        meta: {
          cursor: nextCursor,
          hasMore: nextCursor !== null,
        },
      },
    };
  }

  async create(data: CreateConversationInput, userId: string) {
    const conversation = await this.repository.create(data, userId);
    const participants = await this.repository.findParticipants(conversation.id);

    return {
      data: {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        participants: participants.map((p) => ({
          user: {
            id: p.userId,
            username: p.username,
            displayName: p.displayName,
          },
          role: p.role,
        })),
      },
    };
  }

  async findById(conversationId: string, userId: string) {
    const conversation = await this.repository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    const isParticipant = await this.repository.isUserParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a participant of this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    const participants = await this.repository.findParticipants(conversationId);
    const createdByUser = participants.find((p) => p.userId === conversation.createdBy);

    return {
      data: {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        avatarUrl: conversation.avatarUrl,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        createdBy: createdByUser
          ? {
              id: createdByUser.userId,
              username: createdByUser.username,
              displayName: createdByUser.displayName,
              avatarUrl: createdByUser.avatarUrl,
              lastSeenAt: createdByUser.lastSeenAt?.toISOString() ?? null,
            }
          : null,
        participants: participants.map((p) => ({
          user: {
            id: p.userId,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
          },
          role: p.role,
          joinedAt: p.joinedAt.toISOString(),
        })),
      },
    };
  }

  async delete(conversationId: string, userId: string) {
    const conversation = await this.repository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Only owner can delete
    if (conversation.createdBy !== userId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the conversation owner can delete it',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    await this.repository.softDelete(conversationId);

    return {
      data: {
        message: 'Conversation deleted successfully',
      },
    };
  }

  async join(conversationId: string, userId: string) {
    const conversation = await this.repository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    const isParticipant = await this.repository.isUserParticipant(conversationId, userId);
    if (isParticipant) {
      return {
        data: {
          message: 'Already a participant',
        },
      };
    }

    await this.repository.joinConversation(conversationId, userId);

    return {
      data: {
        message: 'Joined conversation successfully',
      },
    };
  }

  async leave(conversationId: string, userId: string) {
    const conversation = await this.repository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    const isParticipant = await this.repository.isUserParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a participant of this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Owner cannot leave, must delete
    if (conversation.createdBy === userId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'Owner cannot leave. Delete the conversation instead.',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    await this.repository.leaveConversation(conversationId, userId);

    return {
      data: {
        message: 'Left conversation successfully',
      },
    };
  }
}
