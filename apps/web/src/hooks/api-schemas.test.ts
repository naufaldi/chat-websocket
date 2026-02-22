/**
 * Frontend API Schema Integration Tests
 * 
 * Tests that frontend correctly parses API responses using shared Zod schemas.
 * 
 * Run: bun test src/hooks/api-schemas.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  conversationDetailSchema,
  conversationCreatedSchema,
  messagesListResponseSchema,
  messageSchema,
  createConversationSchema,
  userPresenceResponseSchema,
  readReceiptsListResponseSchema,
} from '@chat/shared';

// Valid test UUIDs
const UUIDS = {
  u1: '11111111-1111-4111-8111-111111111111',
  u2: '22222222-2222-4222-8222-222222222222',
  u3: '33333333-3333-4333-8333-333333333333',
  u4: '44444444-4444-4444-8444-444444444444',
};

const dt = (h: number) => `2026-01-01T${h.toString().padStart(2, '0')}:00:00.000Z`;

describe('Frontend API Schema Integration', () => {
  describe('Conversations API Responses', () => {
    it('validates conversation detail response', () => {
      const apiResponse = {
        id: UUIDS.u1,
        type: 'group' as const,
        title: 'Team Chat',
        avatarUrl: null,
        createdBy: {
          id: UUIDS.u2,
          username: 'user1',
          displayName: 'User One',
          avatarUrl: null,
          lastSeenAt: null,
        },
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
        participants: [
          {
            user: {
              id: UUIDS.u2,
              username: 'user1',
              displayName: 'User One',
              avatarUrl: null,
              lastSeenAt: dt(1),
            },
            role: 'owner' as const,
            joinedAt: dt(1),
          },
        ],
      };

      const result = conversationDetailSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
    });

    it('validates conversation created response', () => {
      const apiResponse = {
        id: UUIDS.u1,
        type: 'group' as const,
        title: 'New Group',
        avatarUrl: null,
        createdBy: UUIDS.u2,
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
        participants: [
          {
            user: {
              id: UUIDS.u2,
              username: 'user1',
              displayName: 'User One',
            },
            role: 'owner' as const,
          },
        ],
      };

      const result = conversationCreatedSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Messages API Responses', () => {
    it('validates messages list response', () => {
      const apiResponse = {
        messages: [
          {
            id: UUIDS.u1,
            conversationId: UUIDS.u2,
            senderId: UUIDS.u3,
            content: 'Hello world!',
            contentType: 'text' as const,
            clientMessageId: null,
            status: 'delivered' as const,
            replyToId: null,
            createdAt: dt(1),
            updatedAt: dt(1),
            deletedAt: null,
          },
        ],
      };

      const result = messagesListResponseSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
    });

    it('validates single message schema', () => {
      const message = {
        id: UUIDS.u1,
        conversationId: UUIDS.u2,
        senderId: UUIDS.u3,
        content: 'Test message',
        contentType: 'text' as const,
        clientMessageId: null,
        status: 'delivered' as const,
        replyToId: null,
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
      };

      const result = messageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });
  });

  describe('Presence API Responses', () => {
    it('validates user presence response - online', () => {
      const apiResponse = {
        userId: UUIDS.u1,
        status: 'online' as const,
        lastActivity: dt(5),
        lastSeenAt: null,
      };

      const result = userPresenceResponseSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('online');
    });

    it('validates user presence response - offline', () => {
      const apiResponse = {
        userId: UUIDS.u1,
        status: 'offline' as const,
        lastActivity: null,
        lastSeenAt: dt(1),
      };

      const result = userPresenceResponseSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('offline');
    });

    it('validates user presence response - away', () => {
      const apiResponse = {
        userId: UUIDS.u1,
        status: 'away' as const,
        lastActivity: dt(3),
        lastSeenAt: null,
      };

      const result = userPresenceResponseSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Read Receipts API Responses', () => {

    it('validates empty receipts list', () => {
      const apiResponse = {
        receipts: [],
        totalCount: 0,
        readCount: 0,
      };

      const result = readReceiptsListResponseSchema.safeParse(apiResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Input Schema Validation', () => {
    it('validates create conversation input - group', () => {
      const input = {
        type: 'group' as const,
        title: 'New Group',
        participantIds: [UUIDS.u1],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates create conversation input - direct', () => {
      const input = {
        type: 'direct' as const,
        participantIds: [UUIDS.u1],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects group without title', () => {
      const input = {
        type: 'group' as const,
        participantIds: [UUIDS.u1],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty participants', () => {
      const input = {
        type: 'direct' as const,
        participantIds: [],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('rejects invalid message status', () => {
      const message = {
        id: UUIDS.u1,
        conversationId: UUIDS.u2,
        senderId: UUIDS.u3,
        content: 'Test',
        contentType: 'text' as const,
        clientMessageId: null,
        status: 'invalid_status',
        replyToId: null,
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
      };

      const result = messageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID format', () => {
      const input = {
        type: 'group' as const,
        title: 'Test',
        participantIds: ['not-a-uuid'],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
