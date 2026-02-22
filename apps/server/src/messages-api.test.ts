/**
 * Messages API Schema Tests
 * 
 * Validates message schemas without starting full server.
 * 
 * Run: bun test src/messages-api.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  messageSchema,
  sendMessageSchema,
  messagesListResponseSchema,
} from '@chat/shared';

const UUIDS = {
  u1: '11111111-1111-4111-8111-111111111111',
  u2: '22222222-2222-4222-8222-222222222222',
  u3: '33333333-3333-4333-8333-333333333333',
};

const dt = (h: number) => `2026-01-01T${h.toString().padStart(2, '0')}:00:00.000Z`;

describe('Messages API Schemas', () => {
  describe('messageSchema', () => {
    it('validates complete message', () => {
      const message = {
        id: UUIDS.u1,
        conversationId: UUIDS.u2,
        senderId: UUIDS.u3,
        content: 'Hello world!',
        contentType: 'text',
        clientMessageId: null,
        status: 'delivered',
        replyToId: null,
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
      };

      const result = messageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('rejects invalid message status', () => {
      const message = {
        id: UUIDS.u1,
        conversationId: UUIDS.u2,
        senderId: UUIDS.u3,
        content: 'Test',
        contentType: 'text',
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
      const message = {
        id: 'not-a-uuid',
        conversationId: UUIDS.u2,
        senderId: UUIDS.u3,
        content: 'Test',
        contentType: 'text',
        clientMessageId: null,
        status: 'sent',
        replyToId: null,
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
      };

      const result = messageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });
  });

  describe('messagesListResponseSchema', () => {
    it('validates messages list response', () => {
      const response = {
        messages: [
          {
            id: UUIDS.u1,
            conversationId: UUIDS.u2,
            senderId: UUIDS.u3,
            content: 'First message',
            contentType: 'text',
            clientMessageId: null,
            status: 'delivered',
            replyToId: null,
            createdAt: dt(1),
            updatedAt: dt(1),
            deletedAt: null,
          },
        ],
      };

      const result = messagesListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('validates empty messages list', () => {
      const response = { messages: [] };
      const result = messagesListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
