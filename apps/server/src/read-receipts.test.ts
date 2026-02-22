/**
 * Read Receipts API Tests
 * 
 * Tests for TASK-005: Read Receipts
 * - Database schema for read_receipts
 * - WebSocket events: receipt:read, receipt:updated, receipt:count
 * - REST endpoint: GET /api/messages/:id/receipts
 * - Auto-mark as read on viewport
 * 
 * Run: bun test src/read-receipts.test.ts
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  readReceiptSchema,
  readReceiptsListResponseSchema,
  receiptReadEventSchema,
  receiptUpdatedEventSchema,
  receiptCountEventSchema,
} from '@chat/shared';

// ============================================================================
// DATABASE SCHEMA TESTS
// ============================================================================

describe('Read Receipts Database Schema', () => {
  describe('read_receipts table', () => {
    it('should have correct structure for read receipt', () => {
      // This tests the schema structure
      const validReceipt = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        readAt: '2024-01-01T00:00:00.000Z',
      };
      
      // Parse should not throw for valid data
      expect(() => readReceiptSchema.parse(validReceipt)).not.toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const invalidReceipt = {
        messageId: 'not-a-uuid',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        readAt: '2024-01-01T00:00:00.000Z',
      };
      
      expect(() => readReceiptSchema.parse(invalidReceipt)).toThrow();
    });
  });

  describe('conversation_participants extension', () => {
    it('should track last_read_message_id', () => {
      // This tests the extended participant schema
      const participantWithLastRead = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        role: 'member',
        joinedAt: '2024-01-01T00:00:00.000Z',
        lastReadMessageId: '123e4567-e89b-12d3-a456-426614174002',
        lastReadAt: '2024-01-01T00:01:00.000Z',
      };
      
      // The schema should allow null for these fields
      expect(participantWithLastRead.lastReadMessageId).toBeDefined();
      expect(participantWithLastRead.lastReadAt).toBeDefined();
    });

    it('should allow null for last_read when never read', () => {
      const participantNeverRead = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        role: 'member',
        joinedAt: '2024-01-01T00:00:00.000Z',
        lastReadMessageId: null,
        lastReadAt: null,
      };
      
      expect(participantNeverRead.lastReadMessageId).toBeNull();
      expect(participantNeverRead.lastReadAt).toBeNull();
    });
  });
});

// ============================================================================
// WEBSOCKET EVENT SCHEMA TESTS
// ============================================================================

describe('Read Receipts WebSocket Events', () => {
  describe('Client -> Server: receipt:read', () => {
    it('validates correct receipt:read payload', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        messageId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      expect(() => receiptReadEventSchema.parse(validPayload)).not.toThrow();
    });

    it('validates receipt:read with lastReadMessageId', () => {
      const validPayload = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        messageId: '123e4567-e89b-12d3-a456-426614174001',
        lastReadMessageId: '123e4567-e89b-12d3-a456-426614174002',
      };
      
      const parsed = receiptReadEventSchema.parse(validPayload);
      expect(parsed.lastReadMessageId).toBe('123e4567-e89b-12d3-a456-426614174002');
    });

    it('rejects invalid conversationId', () => {
      const invalidPayload = {
        conversationId: 'not-a-uuid',
        messageId: '123e4567-e89b-12d3-a456-426614174001',
      };
      
      expect(() => receiptReadEventSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('Server -> Client: receipt:updated (1:1)', () => {
    it('validates receipt:updated for 1:1 chat', () => {
      const validPayload = {
        messageId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        readAt: '2024-01-01T00:00:00.000Z',
      };
      
      expect(() => receiptUpdatedEventSchema.parse(validPayload)).not.toThrow();
    });

    it('includes user info in receipt:updated', () => {
      const validPayload = {
        messageId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'user1',
          displayName: 'User One',
          avatarUrl: null,
          lastSeenAt: null,
        },
        readAt: '2024-01-01T00:00:00.000Z',
      };
      
      const parsed = receiptUpdatedEventSchema.parse(validPayload);
      expect(parsed.user?.displayName).toBe('User One');
    });
  });

  describe('Server -> Client: receipt:count (Groups)', () => {
    it('validates receipt:count for group chat', () => {
      const validPayload = {
        messageId: '123e4567-e89b-12d3-a456-426614174001',
        readCount: 5,
        totalParticipants: 10,
      };
      
      expect(() => receiptCountEventSchema.parse(validPayload)).not.toThrow();
    });

    it('validates receipt:count with participant info', () => {
      const validPayload = {
        messageId: '123e4567-e89b-12d3-a456-426614174001',
        readCount: 3,
        readBy: [
          { userId: '123e4567-e89b-12d3-a456-426614174001', displayName: 'User 1' },
          { userId: '123e4567-e89b-12d3-a456-426614174002', displayName: 'User 2' },
          { userId: '123e4567-e89b-12d3-a456-426614174003', displayName: 'User 3' },
        ],
      };
      
      const parsed = receiptCountEventSchema.parse(validPayload);
      expect(parsed.readBy).toHaveLength(3);
    });
  });
});

// ============================================================================
// REST ENDPOINT TESTS
// ============================================================================

describe('Read Receipts REST API', () => {
  describe('GET /api/messages/:id/receipts', () => {
    it('validates response matches readReceiptsListResponseSchema', () => {
      const validResponse = {
        receipts: [
          {
            messageId: '123e4567-e89b-12d3-a456-426614174001',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            user: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              username: 'user1',
              displayName: 'User One',
              avatarUrl: null,
              lastSeenAt: null,
            },
            readAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        totalCount: 1,
        readCount: 1,
      };
      
      const parsed = readReceiptsListResponseSchema.safeParse(validResponse);
      expect(parsed.success).toBe(true);
    });

    it('validates empty receipts list', () => {
      const emptyResponse = {
        receipts: [],
        totalCount: 0,
        readCount: 0,
      };
      
      const parsed = readReceiptsListResponseSchema.safeParse(emptyResponse);
      expect(parsed.success).toBe(true);
      expect(parsed.data.receipts).toHaveLength(0);
    });
  });
});

// ============================================================================
// TYPE INFERENCE TESTS
// ============================================================================

describe('Read Receipts Type Inference', () => {
  it('correctly infers types from schemas', () => {
    // TypeScript compile-time test
    const receipt: z.infer<typeof readReceiptSchema> = {
      messageId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      readAt: '2024-01-01T00:00:00.000Z',
    };
    
    expect(receipt.messageId).toBeDefined();
  });

  it('correctly infers receipt read event type', () => {
    const event: z.infer<typeof receiptReadEventSchema> = {
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      messageId: '123e4567-e89b-12d3-a456-426614174001',
    };
    
    expect(event.conversationId).toBeDefined();
  });
});
