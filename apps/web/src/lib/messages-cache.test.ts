import { describe, expect, it } from 'vitest';
import type { Message } from '@chat/shared/schemas/message';
import { ackOptimistic, markMessageError, upsertMessage } from './messages-cache';

const BASE_MESSAGE: Message = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  senderId: '11111111-1111-4111-8111-111111111111',
  content: 'hello',
  contentType: 'text',
  clientMessageId: null,
  status: 'delivered',
  replyToId: null,
  createdAt: '2026-02-23T00:00:00.000Z',
  updatedAt: '2026-02-23T00:00:00.000Z',
  deletedAt: null,
};

describe('messages-cache', () => {
  it('upsertMessage appends new message and sorts by createdAt ascending', () => {
    const later = {
      ...BASE_MESSAGE,
      id: '00000000-0000-4000-8000-000000000002',
      createdAt: '2026-02-23T00:01:00.000Z',
      updatedAt: '2026-02-23T00:01:00.000Z',
    };
    const earlier = {
      ...BASE_MESSAGE,
      id: '00000000-0000-4000-8000-000000000003',
      createdAt: '2026-02-22T23:59:00.000Z',
      updatedAt: '2026-02-22T23:59:00.000Z',
    };

    const result = upsertMessage([later], earlier);

    expect(result.map((message) => message.id)).toEqual([
      earlier.id,
      later.id,
    ]);
  });

  it('ackOptimistic maps optimistic message to delivered server message id', () => {
    const clientMessageId = '123e4567-e89b-42d3-a456-426614174000';
    const optimistic: Message = {
      ...BASE_MESSAGE,
      id: clientMessageId,
      clientMessageId,
      status: 'sending',
      createdAt: '2026-02-23T00:02:00.000Z',
      updatedAt: '2026-02-23T00:02:00.000Z',
    };

    const result = ackOptimistic(
      [optimistic],
      {
        clientMessageId,
        messageId: '123e4567-e89b-42d3-a456-426614174001',
        timestamp: '2026-02-23T00:02:05.000Z',
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '123e4567-e89b-42d3-a456-426614174001',
      status: 'delivered',
      createdAt: '2026-02-23T00:02:05.000Z',
      updatedAt: '2026-02-23T00:02:05.000Z',
      clientMessageId,
    });
  });

  it('markMessageError sets only matching optimistic message to error', () => {
    const clientMessageId = '123e4567-e89b-42d3-a456-426614174000';
    const optimistic: Message = {
      ...BASE_MESSAGE,
      id: clientMessageId,
      clientMessageId,
      status: 'sending',
    };
    const delivered = {
      ...BASE_MESSAGE,
      id: '123e4567-e89b-42d3-a456-426614174003',
      clientMessageId: '123e4567-e89b-42d3-a456-426614174004',
      status: 'delivered' as const,
    };

    const result = markMessageError([optimistic, delivered], clientMessageId);

    expect(result[0].status).toBe('error');
    expect(result[1].status).toBe('delivered');
  });
});
