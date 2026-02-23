import { Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  authErrorEventSchema,
  authSuccessEventSchema,
  messageErrorEventSchema,
  messageReceivedEventSchema,
  messageSendEventSchema,
  messageSentEventSchema,
  presenceHeartbeatEventSchema,
  presenceUpdateEventSchema,
  subscribedEventSchema,
  subscribeEventSchema,
  typingStartEventSchema,
  typingStartedEventSchema,
  typingStopEventSchema,
  typingStoppedEventSchema,
  unsubscribeEventSchema,
  unsubscribedEventSchema,
  receiptReadEventSchema,
  receiptUpdatedEventSchema,
  receiptCountEventSchema,
} from '@chat/shared';
import { TokenBlacklistService } from '../auth/token-blacklist.service';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { ReadReceiptsService } from '../read-receipts/read-receipts.service';

interface JwtPayload {
  sub: string;
  jti?: string;
}

type SocketWithUserData = Socket & {
  data: Socket['data'] & { userId?: string };
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly readReceiptsService: ReadReceiptsService,
  ) {}

  async handleConnection(client: SocketWithUserData): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.emitAuthError(client, 'Unauthorized', 'AUTH_FAILED');
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (payload.jti && this.tokenBlacklistService.isBlacklisted(payload.jti)) {
        this.emitAuthError(client, 'Token has been revoked', 'AUTH_FAILED');
        client.disconnect(true);
        return;
      }

      client.data.userId = payload.sub;
      client.emit('auth:success', authSuccessEventSchema.parse({ userId: payload.sub }));
    } catch {
      this.emitAuthError(client, 'Unauthorized', 'AUTH_FAILED');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: SocketWithUserData): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
    const userId = client.data.userId;
    if (!userId) {
      return;
    }
    this.presenceService.scheduleOffline(userId, () => {
      this.server.emit(
        'presence:update',
        presenceUpdateEventSchema.parse({
          userId,
          status: 'offline',
        }),
      );
    });
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parse = subscribeEventSchema.safeParse(payload);
    if (!parse.success) {
      this.emitMessageError(client, undefined, 'Invalid payload', 'VALIDATION_ERROR');
      return;
    }

    const userId = client.data.userId;
    if (!userId) {
      this.emitAuthError(client, 'Unauthorized', 'AUTH_FAILED');
      return;
    }

    const { conversationId } = parse.data;
    const isParticipant = await this.chatService.isUserParticipant(userId, conversationId);
    if (!isParticipant) {
      this.emitAuthError(client, 'Not in conversation', 'NOT_IN_CONVERSATION');
      return;
    }

    client.join(this.toConversationRoom(conversationId));
    client.emit('subscribed', subscribedEventSchema.parse({ conversationId }));
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parse = unsubscribeEventSchema.safeParse(payload);
    if (!parse.success) {
      this.emitMessageError(client, undefined, 'Invalid payload', 'VALIDATION_ERROR');
      return;
    }

    const { conversationId } = parse.data;
    client.leave(this.toConversationRoom(conversationId));
    client.emit('unsubscribed', unsubscribedEventSchema.parse({ conversationId }));
  }

  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      this.emitAuthError(client, 'Unauthorized', 'AUTH_FAILED');
      return;
    }

    const parse = messageSendEventSchema.safeParse(payload);
    if (!parse.success) {
      this.emitMessageError(
        client,
        this.extractClientMessageId(payload),
        'Invalid payload',
        'VALIDATION_ERROR',
      );
      return;
    }

    try {
      await this.chatService.assertMessageRateLimit(userId);
      const message = await this.chatService.sendMessage(userId, parse.data);

      client.emit(
        'message:sent',
        messageSentEventSchema.parse({
          clientMessageId: parse.data.clientMessageId,
          messageId: message.id,
          status: 'delivered',
          timestamp: message.createdAt,
          conversationId: message.conversationId,
        }),
      );

      this.server
        .to(this.toConversationRoom(parse.data.conversationId))
        .emit('message:received', messageReceivedEventSchema.parse({ message }));
    } catch (error) {
      const { message, code, retryAfter } = this.resolveSocketError(error);
      const msg = message || 'Failed to send message';
      this.emitMessageError(client, parse.data.clientMessageId, msg, code, retryAfter);
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parse = typingStartEventSchema.safeParse(payload);
    const userId = client.data.userId;
    if (!parse.success || !userId) {
      return;
    }

    client.to(this.toConversationRoom(parse.data.conversationId)).emit(
      'typing:started',
      typingStartedEventSchema.parse({
        conversationId: parse.data.conversationId,
        userId,
      }),
    );
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parse = typingStopEventSchema.safeParse(payload);
    const userId = client.data.userId;
    if (!parse.success || !userId) {
      return;
    }

    client.to(this.toConversationRoom(parse.data.conversationId)).emit(
      'typing:stopped',
      typingStoppedEventSchema.parse({
        conversationId: parse.data.conversationId,
        userId,
      }),
    );
  }

  @SubscribeMessage('presence:heartbeat')
  async handlePresenceHeartbeat(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parse = presenceHeartbeatEventSchema.safeParse(payload);
    const userId = client.data.userId;
    if (!parse.success || !userId) {
      return;
    }

    await this.presenceService.refreshHeartbeat(userId, parse.data.status);

    this.server.emit(
      'presence:update',
      presenceUpdateEventSchema.parse({
        userId,
        status: parse.data.status,
      }),
    );
  }

  @SubscribeMessage('receipt:read')
  async handleReceiptRead(
    @ConnectedSocket() client: SocketWithUserData,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const parse = receiptReadEventSchema.safeParse(payload);
    const userId = client.data.userId;
    if (!parse.success || !userId) {
      return;
    }

    const { conversationId, messageId } = parse.data;

    try {
      // Mark as read in database
      await this.readReceiptsService.markAsRead(userId, conversationId, messageId);

      // Get conversation type to determine broadcast format
      const isDirect = await this.chatService.isDirectConversation(conversationId);

      if (isDirect) {
        // 1:1 chat - instant notification
        client.to(this.toConversationRoom(conversationId)).emit(
          'receipt:updated',
          receiptUpdatedEventSchema.parse({
            messageId,
            userId,
            readAt: new Date().toISOString(),
          }),
        );
      } else {
        // Group chat - send count
        const receipts = await this.readReceiptsService.getReceiptsForMessage(messageId, userId);
        
        client.to(this.toConversationRoom(conversationId)).emit(
          'receipt:count',
          receiptCountEventSchema.parse({
            messageId,
            readCount: receipts.readCount,
            totalParticipants: receipts.totalCount,
          }),
        );
      }
    } catch (error) {
      // Silently fail - don't disrupt the user
      this.logger.debug(`Failed to mark receipt: ${error}`);
    }
  }

  private extractToken(client: SocketWithUserData): string | null {
    const raw = client.handshake.query.token;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }

  private emitAuthError(
    client: SocketWithUserData,
    error: string,
    code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'NOT_IN_CONVERSATION' | 'VALIDATION_ERROR',
  ): void {
    client.emit('auth:error', authErrorEventSchema.parse({ error, code }));
  }

  private emitMessageError(
    client: SocketWithUserData,
    clientMessageId: string | undefined,
    message: string,
    code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'NOT_IN_CONVERSATION' | 'VALIDATION_ERROR' | 'DB_ERROR' | 'REDIS_UNAVAILABLE' | 'INTERNAL_ERROR',
    retryAfter?: number,
  ): void {
    client.emit(
      'message:error',
      messageErrorEventSchema.parse({
        clientMessageId: clientMessageId ?? crypto.randomUUID(),
        message,
        code,
        retryable: code === 'RATE_LIMITED' || code === 'DB_ERROR' || code === 'REDIS_UNAVAILABLE' || code === 'INTERNAL_ERROR',
        retryAfter,
        context: {
          event: 'message:send',
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }

  private extractClientMessageId(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
      return undefined;
    }
    const value = (payload as { clientMessageId?: unknown }).clientMessageId;
    return typeof value === 'string' ? value : undefined;
  }

  private toConversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private resolveSocketError(error: unknown): {
    message: string;
    code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'NOT_IN_CONVERSATION' | 'VALIDATION_ERROR' | 'DB_ERROR' | 'REDIS_UNAVAILABLE' | 'INTERNAL_ERROR';
    retryAfter?: number;
  } {
    if (error instanceof HttpException) {
      const response = error.getResponse() as
        | { error?: { code?: unknown; message?: unknown; retryAfterMs?: unknown } }
        | string;
      if (typeof response === 'object' && response?.error) {
        const code = response.error.code;
        const message = response.error.message;
        const retryAfterMs = response.error.retryAfterMs;
        const retryAfter = typeof retryAfterMs === 'number' ? Math.ceil(retryAfterMs / 1000) : undefined;
        if (
          code === 'RATE_LIMITED' ||
          code === 'NOT_IN_CONVERSATION' ||
          code === 'AUTH_FAILED' ||
          code === 'VALIDATION_ERROR' ||
          code === 'DB_ERROR' ||
          code === 'REDIS_UNAVAILABLE' ||
          code === 'INTERNAL_ERROR'
        ) {
          return {
            code,
            message: typeof message === 'string' ? message : error.message,
            retryAfter,
          };
        }
      }
      return {
        code: error.getStatus() === 429 ? 'RATE_LIMITED' : 'NOT_IN_CONVERSATION',
        message: error.message,
        retryAfter: error.getStatus() === 429 ? 60 : undefined,
      };
    }

    const err = error as Error;
    const fallbackMessage = err?.message || 'Failed to send message';
    return {
      code: fallbackMessage.includes('Too many messages') ? 'RATE_LIMITED' : 'NOT_IN_CONVERSATION',
      message: fallbackMessage,
      retryAfter: fallbackMessage.includes('Too many messages') ? 60 : undefined,
    };
  }
}
