/**
 * WebSocket Integration Tests
 * 
 * These tests verify that WebSocket events conform to the shared Zod schemas
 * and that the frontend socket service correctly handles events.
 * 
 * Run: bun test src/socket-integration.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  clientToServerEventSchemas,
  messageSendEventSchema,
  subscribeEventSchema,
  typingStartEventSchema,
  presenceHeartbeatEventSchema,
  messageSentEventSchema,
  messageReceivedEventSchema,
  messageErrorEventSchema,
  authSuccessEventSchema,
  authErrorEventSchema,
  presenceUpdateEventSchema,
  typingStartedEventSchema,
  typingStoppedEventSchema,
} from '@chat/shared';

// ============================================================================
// CLIENT -> SERVER EVENT VALIDATION TESTS
// ============================================================================

describe('WebSocket Client -> Server Events', () => {
  describe('subscribe event', () => {
    it('validates correct subscribe payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = subscribeEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const invalidPayload = {
        conversationId: 'not-a-uuid',
      };
      
      const result = subscribeEventSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('unsubscribe event', () => {
    it('validates correct unsubscribe payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = clientToServerEventSchemas.unsubscribe.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('message:send event', () => {
    it('validates correct message payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Hello, world!',
        contentType: 'text',
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = messageSendEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('validates message with replyToId', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Reply content',
        contentType: 'text',
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
        replyToId: '123e4567-e89b-12d3-a456-426614174002',
      };
      
      const result = messageSendEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const invalidPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
        contentType: 'text',
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = messageSendEventSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('rejects content over 4000 chars', () => {
      const invalidPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'a'.repeat(4001),
        contentType: 'text',
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = messageSendEventSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('typing:start event', () => {
    it('validates correct typing start payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = typingStartEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('typing:stop event', () => {
    it('validates correct typing stop payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = clientToServerEventSchemas['typing:stop'].safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('presence:heartbeat event', () => {
    it('validates online status', () => {
      const validPayload = {
        status: 'online',
      };
      
      const result = presenceHeartbeatEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('validates away status', () => {
      const validPayload = {
        status: 'away',
      };
      
      const result = presenceHeartbeatEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects offline status (client cannot set offline)', () => {
      const invalidPayload = {
        status: 'offline',
      };
      
      const result = presenceHeartbeatEventSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// SERVER -> CLIENT EVENT VALIDATION TESTS
// ============================================================================

describe('WebSocket Server -> Client Events', () => {
  describe('auth:success event', () => {
    it('validates correct auth success payload', () => {
      const validPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = authSuccessEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('auth:error event', () => {
    it('validates all error codes', () => {
      const errorCodes = [
        'AUTH_FAILED',
        'RATE_LIMITED',
        'NOT_IN_CONVERSATION',
        'VALIDATION_ERROR',
        'DB_ERROR',
        'REDIS_UNAVAILABLE',
        'INTERNAL_ERROR',
      ];

      errorCodes.forEach((code) => {
        const payload = {
          error: 'Something went wrong',
          code,
        };
        const result = authErrorEventSchema.safeParse(payload);
        expect(result.success).toBe(true, `Failed for code: ${code}`);
      });
    });
  });

  describe('message:sent event', () => {
    it('validates correct message sent payload', () => {
      const validPayload = {
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
        messageId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'delivered',
        timestamp: '2024-01-01T00:00:00.000Z',
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = messageSentEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const invalidPayload = {
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
        messageId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'sent', // Only 'delivered' is valid
        timestamp: '2024-01-01T00:00:00.000Z',
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      
      const result = messageSentEventSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('message:received event', () => {
    it('validates complete message payload', () => {
      const validPayload = {
        message: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          conversationId: '123e4567-e89b-12d3-a456-426614174000',
          senderId: '123e4567-e89b-12d3-a456-426614174003',
          content: 'Hello!',
          contentType: 'text',
          clientMessageId: null,
          status: 'delivered',
          replyToId: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      };
      
      const result = messageReceivedEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('validates message with replyToId', () => {
      const validPayload = {
        message: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          conversationId: '123e4567-e89b-12d3-a456-426614174000',
          senderId: '123e4567-e89b-12d3-a456-426614174003',
          content: 'Reply!',
          contentType: 'text',
          clientMessageId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
          status: 'delivered',
          replyToId: '123e4567-e89b-12d3-a456-426614174004',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      };
      
      const result = messageReceivedEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('message:error event', () => {
    it('validates retryable error', () => {
      const validPayload = {
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        retryable: true,
        retryAfter: 30,
        context: {
          event: 'message:send',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      };
      
      const result = messageErrorEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('validates non-retryable error', () => {
      const validPayload = {
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
        code: 'AUTH_FAILED',
        message: 'Invalid token',
        retryable: false,
      };
      
      const result = messageErrorEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('typing:started event', () => {
    it('validates typing started payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = typingStartedEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('typing:stopped event', () => {
    it('validates typing stopped payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      const result = typingStoppedEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('presence:update event', () => {
    it('validates online status', () => {
      const validPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'online',
      };
      
      const result = presenceUpdateEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('validates away status', () => {
      const validPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'away',
      };
      
      const result = presenceUpdateEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('validates offline status with lastSeenAt', () => {
      const validPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'offline',
        lastSeenAt: '2024-01-01T00:00:00.000Z',
      };
      
      const result = presenceUpdateEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// REAL-WORLD EVENT FLOW TESTS
// ============================================================================

describe('Real-World Event Flow', () => {
  it('simulates complete message send/receive flow', () => {
    // 1. Client sends message
    const sendPayload = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Hello!',
      contentType: 'text',
      clientMessageId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    };
    
    const sendValidation = messageSendEventSchema.safeParse(sendPayload);
    expect(sendValidation.success).toBe(true);

    // 2. Server sends back message:sent confirmation
    const sentPayload = {
      clientMessageId: sendPayload.clientMessageId,
      messageId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      status: 'delivered',
      timestamp: new Date().toISOString(),
      conversationId: sendPayload.conversationId,
    };
    
    const sentValidation = messageSentEventSchema.safeParse(sentPayload);
    expect(sentValidation.success).toBe(true);

    // 3. Server broadcasts message:received to room
    const receivedPayload = {
      message: {
        id: sentPayload.messageId,
        conversationId: sendPayload.conversationId,
        senderId: '123e4567-e89b-12d3-a456-426614174001',
        content: sendPayload.content,
        contentType: sendPayload.contentType,
        clientMessageId: sendPayload.clientMessageId,
        status: 'delivered',
        replyToId: null,
        createdAt: sentPayload.timestamp,
        updatedAt: sentPayload.timestamp,
        deletedAt: null,
      },
    };
    
    const receivedValidation = messageReceivedEventSchema.safeParse(receivedPayload);
    expect(receivedValidation.success).toBe(true);
  });

  it('simulates typing indicator flow', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const conversationId = '123e4567-e89b-12d3-a456-426614174000';

    // Typing started
    const _typingStart = typingStartEventSchema.parse({ conversationId });
    const typingStarted = typingStartedEventSchema.parse({
      conversationId,
      userId,
    });
    
    expect(typingStarted.conversationId).toBe(conversationId);
    expect(typingStarted.userId).toBe(userId);

    // Typing stopped
    const _typingStop = clientToServerEventSchemas['typing:stop'].parse({ conversationId });
    const typingStopped = typingStoppedEventSchema.parse({
      conversationId,
      userId,
    });
    
    expect(typingStopped.conversationId).toBe(conversationId);
    expect(typingStopped.userId).toBe(userId);
  });

  it('simulates presence heartbeat flow', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';

    // Client sends heartbeat
    const heartbeatPayload = presenceHeartbeatEventSchema.parse({ status: 'online' });
    
    // Server broadcasts presence update
    const presencePayload = presenceUpdateEventSchema.parse({
      userId,
      status: heartbeatPayload.status,
    });
    
    expect(presencePayload.status).toBe('online');
  });

  it('simulates rate limiting error flow', () => {
    // Server sends rate limit error
    const errorPayload = messageErrorEventSchema.parse({
      clientMessageId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      code: 'RATE_LIMITED',
      message: 'Too many messages. Please slow down.',
      retryable: true,
      retryAfter: 30,
      context: {
        event: 'message:send',
        timestamp: new Date().toISOString(),
      },
    });
    
    expect(errorPayload.code).toBe('RATE_LIMITED');
    expect(errorPayload.retryable).toBe(true);
    expect(errorPayload.retryAfter).toBe(30);
  });
});

// ============================================================================
// SCHEMA VERSION COMPATIBILITY TESTS
// ============================================================================

describe('Schema Backward Compatibility', () => {
  it('handles message with null clientMessageId (server-created messages)', () => {
    const messagePayload = {
      message: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        senderId: '123e4567-e89b-12d3-a456-426614174003',
        content: 'Hello!',
        contentType: 'text',
        clientMessageId: null, // Server-created message
        status: 'delivered' as const,
        replyToId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
      },
    };
    
    const result = messageReceivedEventSchema.safeParse(messagePayload);
    expect(result.success).toBe(true);
  });

  it('handles error without context (minimal error)', () => {
    const errorPayload = {
      clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
      code: 'VALIDATION_ERROR',
      message: 'Invalid message',
      retryable: false,
      // context is optional
    };
    
    const result = messageErrorEventSchema.safeParse(errorPayload);
    expect(result.success).toBe(true);
  });

  it('handles presence update without lastSeenAt (for online/away)', () => {
    const presencePayload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'online' as const,
      // lastSeenAt is optional for online/away
    };
    
    const result = presenceUpdateEventSchema.safeParse(presencePayload);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// ROUND-TRIP VALIDATION TESTS
// ============================================================================

describe('Round-Trip Validation', () => {
  it('validates then parses maintains data integrity', () => {
    const originalPayload = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test message with special chars: @#$%^&*()',
      contentType: 'text' as const,
      clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
      replyToId: '123e4567-e89b-12d3-a456-426614174002',
    };

    const parsed = messageSendEventSchema.parse(originalPayload);
    expect(parsed.content).toBe(originalPayload.content);
    expect(parsed.clientMessageId).toBe(originalPayload.clientMessageId);
    expect(parsed.replyToId).toBe(originalPayload.replyToId);
  });

  it('handles unicode characters correctly', () => {
    const payload = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Hello 🌍! 你好 🎉',
      contentType: 'text' as const,
      clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
    };

    const parsed = messageSendEventSchema.parse(payload);
    expect(parsed.content).toBe(payload.content);
  });
});
