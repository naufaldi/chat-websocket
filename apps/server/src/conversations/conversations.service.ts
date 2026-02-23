import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from '../messages/messages.repository';
import { UsersRepository } from '../users/users.repository';
import type { CreateConversationInput, SendMessageResponse } from '@chat/shared';
import { conversations } from '@chat/db';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly repository: ConversationsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly usersRepository: UsersRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

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
          deletedAt: conv.deletedAt?.toISOString() ?? null,
          participants: participants.map((p) => ({
            user: {
              id: p.userId,
              username: p.username,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
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
      conversations: conversationsWithDetails,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  async create(data: CreateConversationInput, userId: string) {
    const conversation = await this.repository.create(data, userId);
    const participants = await this.repository.findParticipants(conversation.id);

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      avatarUrl: conversation.avatarUrl,
      createdBy: conversation.createdBy,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      deletedAt: conversation.deletedAt?.toISOString() ?? null,
      participants: participants.map((p) => ({
        user: {
          id: p.userId,
          username: p.username,
          displayName: p.displayName,
        },
        role: p.role,
      })),
    };
  }

  async listMessages(conversationId: string, userId: string, limit: number) {
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

    const messages = await this.messagesRepository.findByConversation(conversationId, limit);

    return {
      messages: messages
        .slice()
        .reverse()
        .map((message) => ({
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          contentType: message.contentType,
          clientMessageId: message.clientMessageId,
          status: message.status,
          replyToId: message.replyToId,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          deletedAt: message.deletedAt?.toISOString() ?? null,
        })),
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

    if (!createdByUser) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation owner not found',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      avatarUrl: conversation.avatarUrl,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      deletedAt: conversation.deletedAt?.toISOString() ?? null,
      createdBy: {
        id: createdByUser.userId,
        username: createdByUser.username,
        displayName: createdByUser.displayName,
        avatarUrl: createdByUser.avatarUrl,
        lastSeenAt: createdByUser.lastSeenAt?.toISOString() ?? null,
      },
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

    return { message: 'Conversation deleted successfully' };
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
      return { message: 'Already a participant' };
    }

    await this.repository.joinConversation(conversationId, userId);

    return { message: 'Joined conversation successfully' };
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

    return { message: 'Left conversation successfully' };
  }

  async sendMessageHttp(
    conversationId: string,
    senderId: string,
    data: {
      content: string;
      contentType: 'text';
      clientMessageId: string;
      replyToId?: string;
    },
  ): Promise<SendMessageResponse> {
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

    const isParticipant = await this.repository.isUserParticipant(conversationId, senderId);
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

    const existing = await this.messagesRepository.findByClientMessageId(data.clientMessageId);
    if (existing) {
      const sender = await this.usersRepository.findById(existing.senderId);
      return {
        message: {
          id: existing.id,
          conversationId: existing.conversationId,
          senderId: existing.senderId,
          sender: {
            id: sender?.id ?? existing.senderId,
            username: sender?.username ?? '',
            displayName: sender?.displayName ?? null,
            avatarUrl: sender?.avatarUrl ?? null,
          },
          content: existing.content,
          contentType: existing.contentType,
          clientMessageId: existing.clientMessageId,
          status: existing.status,
          replyToId: existing.replyToId,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
          deletedAt: existing.deletedAt?.toISOString() ?? null,
        },
        existing: true,
      };
    }

    const message = await this.messagesRepository.create({
      conversationId,
      senderId,
      content: data.content,
      contentType: data.contentType,
      clientMessageId: data.clientMessageId,
      replyToId: data.replyToId,
    });

    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const sender = await this.usersRepository.findById(senderId);

    return {
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        sender: {
          id: sender?.id ?? senderId,
          username: sender?.username ?? '',
          displayName: sender?.displayName ?? null,
          avatarUrl: sender?.avatarUrl ?? null,
        },
        content: message.content,
        contentType: message.contentType,
        clientMessageId: message.clientMessageId,
        status: message.status,
        replyToId: message.replyToId,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        deletedAt: message.deletedAt?.toISOString() ?? null,
      },
      existing: false,
    };
  }
}
