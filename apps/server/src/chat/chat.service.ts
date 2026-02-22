import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Message, SendMessageInput } from '@chat/shared';
import { createClient } from 'redis';
import { ConversationsRepository } from '../conversations/conversations.repository';
import { MessagesRepository } from '../messages/messages.repository';

const MESSAGE_LIMIT_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEDUP_TTL_SECONDS = 300;

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class ChatService {
  private readonly messageTimestampsByUser = new Map<string, number[]>();
  private readonly inMemoryDedup = new Map<string, number>();
  private redisClient: RedisClient | null = null;

  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return;
    }

    const client = createClient({ url: redisUrl });
    client
      .connect()
      .then(() => {
        this.redisClient = client;
      })
      .catch(() => {
        this.redisClient = null;
      });
  }

  async isUserParticipant(userId: string, conversationId: string): Promise<boolean> {
    return this.conversationsRepository.isUserParticipant(conversationId, userId);
  }

  async isDirectConversation(conversationId: string): Promise<boolean> {
    const conversation = await this.conversationsRepository.findById(conversationId);
    return conversation?.type === 'direct';
  }

  async assertMessageRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const existing = this.messageTimestampsByUser.get(userId) ?? [];
    const activeInWindow = existing.filter((timestamp) => timestamp > windowStart);

    if (activeInWindow.length >= MESSAGE_LIMIT_PER_MINUTE) {
      this.messageTimestampsByUser.set(userId, activeInWindow);
      throw new HttpException({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many messages. Please retry later.',
          retryable: true,
          retryAfterMs: RATE_LIMIT_WINDOW_MS,
          traceId: crypto.randomUUID(),
        },
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    activeInWindow.push(now);
    this.messageTimestampsByUser.set(userId, activeInWindow);
  }

  async sendMessage(userId: string, input: SendMessageInput): Promise<Message> {
    const isParticipant = await this.isUserParticipant(userId, input.conversationId);
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

    const reserved = await this.reserveDedupKey(input.clientMessageId);
    if (!reserved) {
      const existing = await this.messagesRepository.findByClientMessageId(input.clientMessageId);
      if (existing) {
        return this.toSharedMessage(existing);
      }

      throw new HttpException({
        error: {
          code: 'DB_ERROR',
          message: 'Message is already being processed',
          retryable: true,
          traceId: crypto.randomUUID(),
        },
      }, HttpStatus.CONFLICT);
    }

    const existing = await this.messagesRepository.findByClientMessageId(input.clientMessageId);
    if (existing) {
      return this.toSharedMessage(existing);
    }

    const created = await this.messagesRepository.create({
      ...input,
      senderId: userId,
    });
    return this.toSharedMessage(created);
  }

  private async reserveDedupKey(clientMessageId: string): Promise<boolean> {
    const key = `dedup:${clientMessageId}`;

    if (this.redisClient) {
      const result = await this.redisClient.set(key, '1', { NX: true, EX: DEDUP_TTL_SECONDS });
      return result === 'OK';
    }

    const now = Date.now();
    const expiresAt = this.inMemoryDedup.get(key);
    if (expiresAt && expiresAt > now) {
      return false;
    }

    this.inMemoryDedup.set(key, now + DEDUP_TTL_SECONDS * 1000);
    return true;
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
