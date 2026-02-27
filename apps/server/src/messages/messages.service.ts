import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagesRepository } from './messages.repository';
import { ConversationsRepository } from '../conversations/conversations.repository';
import type { Message, SendMessageInput } from '@chat/shared';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly conversationsRepository: ConversationsRepository,
  ) {}

  async sendMessage(userId: string, conversationId: string, input: SendMessageInput): Promise<Message> {
    // Check if user is a participant
    const isParticipant = await this.conversationsRepository.isUserParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException({
        error: {
          code: 'NOT_IN_CONVERSATION',
          message: 'You are not a participant in this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Create the message
    const message = await this.messagesRepository.create({
      ...input,
      senderId: userId,
    });

    return this.toSharedMessage(message);
  }

  async deleteMessage(messageId: string, userId: string, conversationId: string): Promise<void> {
    // Check if message exists
    const message = await this.messagesRepository.findById(messageId);
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

    // Check if message belongs to this conversation
    if (message.conversationId !== conversationId) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found in this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Check if user is the sender
    if (message.senderId !== userId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own messages',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // Soft delete the message
    await this.messagesRepository.softDelete(messageId);
  }

  async listMessages(
    conversationId: string,
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
    // Check if user is a participant
    const isParticipant = await this.conversationsRepository.isUserParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException({
        error: {
          code: 'NOT_IN_CONVERSATION',
          message: 'You are not a participant in this conversation',
          retryable: false,
          traceId: crypto.randomUUID(),
        },
      });
    }

    const result = await this.messagesRepository.findByConversation(conversationId, limit, cursor);

    return {
      messages: result.messages.map((msg) => this.toSharedMessage(msg)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  private toSharedMessage(message: {
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
  }): Message {
    return {
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
      deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
    };
  }
}
