import { z } from 'zod';

export const conversationTypeSchema = z.enum(['direct', 'group']);
export const participantRoleSchema = z.enum(['owner', 'admin', 'member']);

export const conversationSchema = z.object({
  id: z.string().uuid(),
  type: conversationTypeSchema,
  title: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createConversationSchema = z.object({
  type: conversationTypeSchema,
  title: z.string().max(100).optional(),
  participantIds: z.array(z.string().uuid())
    .min(1, 'At least one participant required')
    .max(100, 'Maximum 100 participants'),
}).refine(
  (data) => data.type !== 'group' || data.title,
  {
    message: 'Title is required for group conversations',
    path: ['title'],
  }
);

export type Conversation = z.infer<typeof conversationSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ConversationType = z.infer<typeof conversationTypeSchema>;
export type ParticipantRole = z.infer<typeof participantRoleSchema>;
