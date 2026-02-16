// Re-export types from shared package (single source of truth)
import {
  conversationSchema,
  createConversationSchema,
  conversationTypeSchema,
  conversationListItemSchema,
  conversationDetailSchema,
  conversationCreatedSchema,
  participantRoleSchema,
  type Conversation,
  type CreateConversationInput,
  type ConversationType,
  type ConversationListItem,
  type ConversationDetail,
  type ConversationCreated,
  type ParticipantRole,
} from '@chat/shared/schemas/conversation';

export {
  conversationSchema,
  createConversationSchema,
  conversationTypeSchema,
  conversationListItemSchema,
  conversationDetailSchema,
  conversationCreatedSchema,
  participantRoleSchema,
};

export type {
  Conversation,
  CreateConversationInput,
  ConversationType,
  ConversationListItem,
  ConversationDetail,
  ConversationCreated,
  ParticipantRole,
};

// For convenience, create a query response type
export interface ConversationsQueryResponse {
  conversations: ConversationListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
