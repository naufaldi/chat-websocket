import { z } from 'zod';

export const messageStatusSchema = z.enum(['sending', 'delivered', 'read', 'error']);
export const contentTypeSchema = z.enum(['text', 'image', 'file']);

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  contentType: contentTypeSchema,
  clientMessageId: z.string().uuid().nullable(),
  status: messageStatusSchema,
  replyToId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message must be at most 4000 characters'),
  contentType: z.literal('text'),
  clientMessageId: z.string().uuid(),
  replyToId: z.string().uuid().optional(),
});

export type Message = z.infer<typeof messageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageStatus = z.infer<typeof messageStatusSchema>;
export type ContentType = z.infer<typeof contentTypeSchema>;
