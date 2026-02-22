import { z } from 'zod';
import { userPublicSchema } from './user';

export const readReceiptSchema = z.object({
  messageId: z.string().uuid(),
  userId: z.string().uuid(),
  readAt: z.string().datetime(),
});

export const readReceiptWithUserSchema = readReceiptSchema.extend({
  user: userPublicSchema,
});

export const readReceiptsListResponseSchema = z.object({
  receipts: z.array(readReceiptWithUserSchema),
  totalCount: z.number(),
  readCount: z.number(),
});

// WebSocket Events

// Client -> Server
export const receiptReadEventSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  lastReadMessageId: z.string().uuid().optional(),
});

// Server -> Client (1:1 chats)
export const receiptUpdatedEventSchema = z.object({
  messageId: z.string().uuid(),
  userId: z.string().uuid(),
  user: userPublicSchema.optional(),
  readAt: z.string().datetime(),
});

// Server -> Client (Group chats)
export const receiptCountEventSchema = z.object({
  messageId: z.string().uuid(),
  readCount: z.number().int().min(0),
  totalParticipants: z.number().int().min(0).optional(),
  readBy: z.array(z.object({
    userId: z.string().uuid(),
    displayName: z.string(),
  })).optional(),
});

export type ReadReceipt = z.infer<typeof readReceiptSchema>;
export type ReadReceiptWithUser = z.infer<typeof readReceiptWithUserSchema>;
export type ReadReceiptsListResponse = z.infer<typeof readReceiptsListResponseSchema>;
export type ReceiptReadEvent = z.infer<typeof receiptReadEventSchema>;
export type ReceiptUpdatedEvent = z.infer<typeof receiptUpdatedEventSchema>;
export type ReceiptCountEvent = z.infer<typeof receiptCountEventSchema>;
