/**
 * Backend API Schema Tests
 * 
 * Validates API schemas without starting full server.
 * 
 * Run: bun test src/api-integration.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  conversationDetailSchema,
  conversationCreatedSchema,
  createConversationSchema,
  authResponseSchema,
  loginSchema,
} from '@chat/shared';

const UUIDS = {
  u1: '11111111-1111-4111-8111-111111111111',
  u2: '22222222-2222-4222-8222-222222222222',
  u3: '33333333-3333-4333-8333-333333333333',
};

const dt = (h: number): string => `2026-01-01T${h.toString().padStart(2, '0')}:00:00.000Z`;

describe('Conversations API Schema', () => {
  describe('conversationDetailSchema', () => {
    it('validates detail response', () => {
      const response = {
        id: UUIDS.u1,
        type: 'group',
        title: 'My Group',
        avatarUrl: null,
        createdBy: {
          id: UUIDS.u2,
          username: 'owner',
          displayName: 'Group Owner',
          avatarUrl: null,
          lastSeenAt: dt(1),
        },
        createdAt: dt(1),
        updatedAt: dt(1),
        deletedAt: null,
        participants: [],
      };

      const result = conversationDetailSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('conversationCreatedSchema', () => {
    it('validates created response', () => {
      const response = {
        id: UUIDS.u1,
        type: 'group',
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
              username: 'creator',
              displayName: 'Creator',
            },
            role: 'owner',
          },
        ],
      };

      const result = conversationCreatedSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('createConversationSchema', () => {
    it('validates create group input', () => {
      const input = {
        type: 'group',
        title: 'Test Group',
        participantIds: [UUIDS.u2, UUIDS.u3],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates create direct input', () => {
      const input = {
        type: 'direct',
        participantIds: [UUIDS.u2],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects group without title', () => {
      const input = {
        type: 'group',
        participantIds: [UUIDS.u2],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty participants', () => {
      const input = {
        type: 'direct',
        participantIds: [],
      };

      const result = createConversationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Auth API Schema', () => {
  describe('loginSchema', () => {
    it('validates login input', () => {
      const input = {
        email: 'user@test.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const input = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('authResponseSchema', () => {
    it('validates auth response', () => {
      const response = {
        accessToken: 'jwt-token-here',
        refreshToken: 'refresh-token-here',
        user: {
          id: UUIDS.u1,
          email: 'user@test.com',
          username: 'user',
          displayName: 'User',
          avatarUrl: null,
          isActive: true,
          lastSeenAt: null,
          createdAt: dt(1),
          updatedAt: dt(1),
        },
      };

      const result = authResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
