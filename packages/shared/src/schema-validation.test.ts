/**
 * Schema Validation Tests
 * 
 * These tests ensure that the Zod schemas in @chat/shared are the single source of truth
 * for both backend and frontend validation.
 * 
 * Run: bun test src/schema-validation.test.ts
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  // Auth schemas
  loginSchema,
  registerSchema,
  authResponseSchema,
  // Conversation schemas
  conversationTypeSchema,
  participantRoleSchema,
  conversationSchema,
  conversationListItemSchema,
  conversationsListResponseSchema,
  conversationDetailSchema,
  conversationCreatedSchema,
  createConversationSchema,
  // Message schemas
  messageSchema,
  sendMessageSchema,
  messagesListResponseSchema,
  // Socket schemas
  clientToServerEventSchemas,
  serverToClientEventSchemas,
  websocketErrorCodeSchema,
  presenceStatusSchema,
} from '@chat/shared';

// ============================================================================
// AUTH SCHEMAS TESTS
// ============================================================================

describe('Auth Schemas - Single Source of Truth', () => {
  describe('loginSchema', () => {
    it('validates correct login payload', () => {
      const validPayload = {
        email: 'user@example.com',
        password: 'password123',
      };
      expect(() => loginSchema.parse(validPayload)).not.toThrow();
    });

    it('rejects invalid email format', () => {
      const invalidPayload = {
        email: 'not-an-email',
        password: 'password123',
      };
      expect(() => loginSchema.parse(invalidPayload)).toThrow();
    });

    it('rejects short password', () => {
      const invalidPayload = {
        email: 'user@example.com',
        password: 'short',
      };
      expect(() => loginSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('registerSchema', () => {
    it('validates correct registration payload', () => {
      const validPayload = {
        email: 'newuser@example.com',
        password: 'securepassword123',
        displayName: 'New User',
      };
      expect(() => registerSchema.parse(validPayload)).not.toThrow();
    });

    it('rejects short display name', () => {
      const invalidPayload = {
        email: 'user@example.com',
        password: 'password123',
        displayName: 'A', // Too short
      };
      expect(() => registerSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('authResponseSchema', () => {
    it('validates auth response with tokens', () => {
      const validResponse = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-value',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          username: 'username',
          displayName: 'User Name',
        },
      };
      expect(() => authResponseSchema.parse(validResponse)).not.toThrow();
    });
  });
});

// ============================================================================
// CONVERSATION SCHEMAS TESTS
// ============================================================================

describe('Conversation Schemas - Single Source of Truth', () => {
  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    username: 'username',
    displayName: 'User Name',
    avatarUrl: null,
    lastSeenAt: null,
  };

  const validParticipant = {
    user: validUser,
    role: 'member' as const,
  };

  describe('conversationTypeSchema', () => {
    it('accepts valid conversation types', () => {
      expect(() => conversationTypeSchema.parse('direct')).not.toThrow();
      expect(() => conversationTypeSchema.parse('group')).not.toThrow();
    });

    it('rejects invalid conversation types', () => {
      expect(() => conversationTypeSchema.parse('invalid')).toThrow();
    });
  });

  describe('participantRoleSchema', () => {
    it('accepts valid roles', () => {
      expect(() => participantRoleSchema.parse('owner')).not.toThrow();
      expect(() => participantRoleSchema.parse('admin')).not.toThrow();
      expect(() => participantRoleSchema.parse('member')).not.toThrow();
    });

    it('rejects invalid roles', () => {
      expect(() => participantRoleSchema.parse('superadmin')).toThrow();
    });
  });

  describe('createConversationSchema', () => {
    it('validates direct conversation', () => {
      const validDirect = {
        type: 'direct',
        participantIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      expect(() => createConversationSchema.parse(validDirect)).not.toThrow();
    });

    it('validates group conversation with title', () => {
      const validGroup = {
        type: 'group',
        title: 'Team Chat',
        participantIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      expect(() => createConversationSchema.parse(validGroup)).not.toThrow();
    });

    it('rejects group without title', () => {
      const invalidGroup = {
        type: 'group',
        participantIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      expect(() => createConversationSchema.parse(invalidGroup)).toThrow();
    });

    it('rejects empty participantIds', () => {
      const invalidPayload = {
        type: 'direct',
        participantIds: [],
      };
      expect(() => createConversationSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('conversationListItemSchema', () => {
    it('validates conversation list item with all fields', () => {
      const validItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'direct' as const,
        title: null,
        avatarUrl: null,
        createdBy: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        participants: [validParticipant],
        lastMessage: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          content: 'Hello!',
          senderId: '123e4567-e89b-12d3-a456-426614174001',
          createdAt: '2024-01-01T00:01:00.000Z',
        },
        unreadCount: 0,
      };
      expect(() => conversationListItemSchema.parse(validItem)).not.toThrow();
    });

    it('validates with group title', () => {
      const groupItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'group' as const,
        title: 'Team Chat',
        avatarUrl: null,
        createdBy: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        participants: [validParticipant],
        lastMessage: null,
        unreadCount: 5,
      };
      expect(() => conversationListItemSchema.parse(groupItem)).not.toThrow();
    });
  });

  describe('conversationsListResponseSchema', () => {
    it('validates paginated response', () => {
      const validResponse = {
        conversations: [],
        nextCursor: null,
        hasMore: false,
      };
      expect(() => conversationsListResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('validates response with cursor', () => {
      const validResponse = {
        conversations: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'direct' as const,
          title: null,
          avatarUrl: null,
          createdBy: '123e4567-e89b-12d3-a456-426614174001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          deletedAt: null,
          participants: [validParticipant],
          lastMessage: null,
          unreadCount: 0,
        }],
        nextCursor: 'eyJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCJ9',
        hasMore: true,
      };
      expect(() => conversationsListResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('conversationDetailSchema', () => {
    it('validates conversation detail with full participant info', () => {
      const validDetail = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'group' as const,
        title: 'Team Chat',
        avatarUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        createdBy: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'owner@example.com',
          username: 'owner',
          displayName: 'Owner User',
          avatarUrl: null,
          lastSeenAt: '2024-01-01T01:00:00.000Z',
        },
        participants: [
          {
            user: {
              ...validUser,
              lastSeenAt: '2024-01-01T01:00:00.000Z',
            },
            role: 'owner' as const,
            joinedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };
      expect(() => conversationDetailSchema.parse(validDetail)).not.toThrow();
    });
  });

  describe('conversationCreatedSchema', () => {
    it('validates created conversation response', () => {
      const validCreated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'group' as const,
        title: 'New Group',
        avatarUrl: null,
        createdBy: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        participants: [
          {
            user: {
              id: '123e4567-e89b-12d3-a456-426614174001',
              username: 'owner',
              displayName: 'Owner',
            },
            role: 'owner' as const,
          },
        ],
      };
      expect(() => conversationCreatedSchema.parse(validCreated)).not.toThrow();
    });
  });
});

// ============================================================================
// MESSAGE SCHEMAS TESTS
// ============================================================================

describe('Message Schemas - Single Source of Truth', () => {
  describe('messageSchema', () => {
    it('validates complete message', () => {
      const validMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        senderId: '123e4567-e89b-12d3-a456-426614174002',
        content: 'Hello, world!',
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'delivered' as const,
        replyToId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
      };
      expect(() => messageSchema.parse(validMessage)).not.toThrow();
    });

    it('validates message with replyToId', () => {
      const messageWithReply = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        senderId: '123e4567-e89b-12d3-a456-426614174002',
        content: 'Reply content',
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'delivered' as const,
        replyToId: '123e4567-e89b-12d3-a456-426614174004',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
      };
      expect(() => messageSchema.parse(messageWithReply)).not.toThrow();
    });
  });

  describe('sendMessageSchema', () => {
    it('validates send message input', () => {
      const validInput = {
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        content: 'Test message',
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174003',
      };
      expect(() => sendMessageSchema.parse(validInput)).not.toThrow();
    });

    it('validates send message with replyToId', () => {
      const validInput = {
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        content: 'Test message',
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174003',
        replyToId: '123e4567-e89b-12d3-a456-426614174004',
      };
      expect(() => sendMessageSchema.parse(validInput)).not.toThrow();
    });

    it('rejects message content over 4000 characters', () => {
      const longContent = 'a'.repeat(4001);
      const invalidInput = {
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        content: longContent,
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174003',
      };
      expect(() => sendMessageSchema.parse(invalidInput)).toThrow();
    });

    it('rejects empty content', () => {
      const invalidInput = {
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        content: '',
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174003',
      };
      expect(() => sendMessageSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('messagesListResponseSchema', () => {
    it('validates messages list response', () => {
      const validResponse = {
        messages: [],
        nextCursor: null,
        hasMore: false,
      };
      expect(() => messagesListResponseSchema.parse(validResponse)).not.toThrow();
    });
  });
});

// ============================================================================
// WEBSOCKET SCHEMAS TESTS
// ============================================================================

describe('WebSocket Schemas - Single Source of Truth', () => {
  describe('Client -> Server Events', () => {
    it('validates subscribe event', () => {
      const validEvent = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => clientToServerEventSchemas.subscribe.parse(validEvent)).not.toThrow();
    });

    it('validates message:send event', () => {
      const validEvent = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Hello!',
        contentType: 'text' as const,
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(() => clientToServerEventSchemas['message:send'].parse(validEvent)).not.toThrow();
    });

    it('validates typing:start event', () => {
      const validEvent = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => clientToServerEventSchemas['typing:start'].parse(validEvent)).not.toThrow();
    });

    it('validates presence:heartbeat event', () => {
      const validEvent = {
        status: 'online' as const,
      };
      expect(() => clientToServerEventSchemas['presence:heartbeat'].parse(validEvent)).not.toThrow();
    });

    it('validates presence:heartbeat with away status', () => {
      const validEvent = {
        status: 'away' as const,
      };
      expect(() => clientToServerEventSchemas['presence:heartbeat'].parse(validEvent)).not.toThrow();
    });
  });

  describe('Server -> Client Events', () => {
    it('validates auth:success event', () => {
      const validEvent = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => serverToClientEventSchemas['auth:success'].parse(validEvent)).not.toThrow();
    });

    it('validates auth:error event with all error codes', () => {
      const errorCodes = ['AUTH_FAILED', 'RATE_LIMITED', 'NOT_IN_CONVERSATION', 'VALIDATION_ERROR', 'DB_ERROR', 'REDIS_UNAVAILABLE', 'INTERNAL_ERROR'];
      
      errorCodes.forEach((code) => {
        const event = {
          error: 'Something went wrong',
          code,
        };
        expect(() => serverToClientEventSchemas['auth:error'].parse(event)).not.toThrow();
      });
    });

    it('validates message:sent event', () => {
      const validEvent = {
        clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
        messageId: '123e4567-e89b-12d3-a456-426614174002',
        status: 'delivered',
        timestamp: '2024-01-01T00:00:00.000Z',
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => serverToClientEventSchemas['message:sent'].parse(validEvent)).not.toThrow();
    });

    it('validates message:error event with retryable', () => {
      const validEvent = {
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
      expect(() => serverToClientEventSchemas['message:error'].parse(validEvent)).not.toThrow();
    });

    it('validates presence:update event with all statuses', () => {
      const statuses: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline'];
      
      statuses.forEach((status) => {
        const event = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          status,
        };
        expect(() => serverToClientEventSchemas['presence:update'].parse(event)).not.toThrow();
      });
    });
  });

  describe('websocketErrorCodeSchema', () => {
    it('contains all expected error codes', () => {
      const expectedCodes = [
        'AUTH_FAILED',
        'RATE_LIMITED',
        'NOT_IN_CONVERSATION',
        'VALIDATION_ERROR',
        'DB_ERROR',
        'REDIS_UNAVAILABLE',
        'INTERNAL_ERROR',
      ];
      
      expectedCodes.forEach((code) => {
        expect(() => websocketErrorCodeSchema.parse(code)).not.toThrow();
      });
    });
  });

  describe('presenceStatusSchema', () => {
    it('contains all expected statuses', () => {
      const expectedStatuses = ['online', 'away', 'offline'];
      
      expectedStatuses.forEach((status) => {
        expect(() => presenceStatusSchema.parse(status)).not.toThrow();
      });
    });
  });
});

// ============================================================================
// SCHEMA INFERENCE TESTS
// ============================================================================

describe('Schema Type Inference', () => {
  it('correctly infers TypeScript types from schemas', () => {
    // This is a compile-time test - if it compiles, types are correctly inferred
    
    // Auth types
    const loginInput: z.infer<typeof loginSchema> = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(loginInput.email).toBeDefined();

    // Conversation types
    const conversationInput: z.infer<typeof createConversationSchema> = {
      type: 'direct',
      participantIds: ['123e4567-e89b-12d3-a456-426614174000'],
    };
    expect(conversationInput.type).toBe('direct');

    // Message types
    const messageInput: z.infer<typeof sendMessageSchema> = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Hello',
      contentType: 'text',
      clientMessageId: '123e4567-e89b-12d3-a456-426614174001',
    };
    expect(messageInput.contentType).toBe('text');

    // WebSocket event types
    const subscribeEvent: z.infer<typeof clientToServerEventSchemas.subscribe> = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(subscribeEvent.conversationId).toBeDefined();
  });
});

// ============================================================================
// BACKWARD COMPATIBILITY TESTS
// ============================================================================

describe('Schema Backward Compatibility', () => {
  it('conversationSchema allows optional fields that were previously required', () => {
    // This test ensures new fields are optional to maintain backward compatibility
    const minimalConversation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'direct' as const,
      title: null,
      avatarUrl: null,
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      deletedAt: null,
    };
    expect(() => conversationSchema.parse(minimalConversation)).not.toThrow();
  });

  it('messageSchema allows messages without clientMessageId (for server-created messages)', () => {
    const serverMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      conversationId: '123e4567-e89b-12d3-a456-426614174001',
      senderId: '123e4567-e89b-12d3-a456-426614174002',
      content: 'Hello!',
      contentType: 'text' as const,
      clientMessageId: null, // Server-created messages may not have clientMessageId
      status: 'delivered' as const,
      replyToId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      deletedAt: null,
    };
    expect(() => messageSchema.parse(serverMessage)).not.toThrow();
  });
});
