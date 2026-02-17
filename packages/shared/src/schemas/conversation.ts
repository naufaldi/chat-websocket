import { z } from 'zod';
import { userPublicSchema } from './user';
import { messageSchema } from './message';

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

// Pagination
export const paginationCursorSchema = z.string();

// List item - for GET /conversations response
export const conversationListItemSchema = conversationSchema.extend({
  participants: z.array(z.object({
    user: userPublicSchema,
    role: participantRoleSchema,
  })),
  lastMessage: messageSchema.pick({
    id: true,
    content: true,
    senderId: true,
    createdAt: true,
  }).nullable(),
  unreadCount: z.number(),
});

export const conversationsListResponseSchema = z.object({
  conversations: z.array(conversationListItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Detail - for GET /conversations/:id response
export const conversationDetailSchema = conversationSchema.extend({
  createdBy: userPublicSchema,
  participants: z.array(z.object({
    user: userPublicSchema.extend({ lastSeenAt: z.string().datetime().nullable() }),
    role: participantRoleSchema,
    joinedAt: z.string().datetime(),
  })),
});

// Create response
export const conversationCreatedSchema = conversationSchema.extend({
  participants: z.array(z.object({
    user: userPublicSchema.pick({ id: true, username: true, displayName: true }),
    role: participantRoleSchema,
  })),
});

export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export type ConversationsListResponse = z.infer<typeof conversationsListResponseSchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
export type ConversationCreated = z.infer<typeof conversationCreatedSchema>;
