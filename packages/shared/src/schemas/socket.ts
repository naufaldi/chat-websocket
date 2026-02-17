import { z } from 'zod';
import { messageSchema, sendMessageSchema } from './message';

export const websocketErrorCodeSchema = z.enum([
  'AUTH_FAILED',
  'RATE_LIMITED',
  'NOT_IN_CONVERSATION',
  'VALIDATION_ERROR',
]);

export const presenceStatusSchema = z.enum(['online', 'away', 'offline']);

// Client -> Server
export const authEventSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const subscribeEventSchema = z.object({
  conversationId: z.string().uuid(),
});

export const unsubscribeEventSchema = z.object({
  conversationId: z.string().uuid(),
});

export const messageSendEventSchema = sendMessageSchema;

export const typingStartEventSchema = z.object({
  conversationId: z.string().uuid(),
});

export const typingStopEventSchema = z.object({
  conversationId: z.string().uuid(),
});

export const presenceHeartbeatEventSchema = z.object({
  status: z.enum(['online', 'away']),
});

// Server -> Client
export const authSuccessEventSchema = z.object({
  userId: z.string().uuid(),
});

export const authErrorEventSchema = z.object({
  error: z.string().min(1),
  code: websocketErrorCodeSchema,
});

export const subscribedEventSchema = z.object({
  conversationId: z.string().uuid(),
});

export const unsubscribedEventSchema = z.object({
  conversationId: z.string().uuid(),
});

export const messageReceivedEventSchema = z.object({
  message: messageSchema,
});

export const messageSentEventSchema = z.object({
  clientMessageId: z.string().uuid(),
  messageId: z.string().uuid(),
  status: z.literal('delivered'),
  timestamp: z.string().datetime(),
});

export const messageErrorEventSchema = z.object({
  clientMessageId: z.string().uuid(),
  error: z.string().min(1),
  code: websocketErrorCodeSchema,
});

export const typingStartedEventSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const typingStoppedEventSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const presenceUpdateEventSchema = z.object({
  userId: z.string().uuid(),
  status: presenceStatusSchema,
});

export const clientToServerEventSchemas = {
  auth: authEventSchema,
  subscribe: subscribeEventSchema,
  unsubscribe: unsubscribeEventSchema,
  'message:send': messageSendEventSchema,
  'typing:start': typingStartEventSchema,
  'typing:stop': typingStopEventSchema,
  'presence:heartbeat': presenceHeartbeatEventSchema,
} as const;

export const serverToClientEventSchemas = {
  'auth:success': authSuccessEventSchema,
  'auth:error': authErrorEventSchema,
  subscribed: subscribedEventSchema,
  unsubscribed: unsubscribedEventSchema,
  'message:received': messageReceivedEventSchema,
  'message:sent': messageSentEventSchema,
  'message:error': messageErrorEventSchema,
  'typing:started': typingStartedEventSchema,
  'typing:stopped': typingStoppedEventSchema,
  'presence:update': presenceUpdateEventSchema,
} as const;

export type WebsocketErrorCode = z.infer<typeof websocketErrorCodeSchema>;
export type PresenceStatus = z.infer<typeof presenceStatusSchema>;

export type AuthEvent = z.infer<typeof authEventSchema>;
export type SubscribeEvent = z.infer<typeof subscribeEventSchema>;
export type UnsubscribeEvent = z.infer<typeof unsubscribeEventSchema>;
export type MessageSendEvent = z.infer<typeof messageSendEventSchema>;
export type TypingStartEvent = z.infer<typeof typingStartEventSchema>;
export type TypingStopEvent = z.infer<typeof typingStopEventSchema>;
export type PresenceHeartbeatEvent = z.infer<typeof presenceHeartbeatEventSchema>;

export type AuthSuccessEvent = z.infer<typeof authSuccessEventSchema>;
export type AuthErrorEvent = z.infer<typeof authErrorEventSchema>;
export type SubscribedEvent = z.infer<typeof subscribedEventSchema>;
export type UnsubscribedEvent = z.infer<typeof unsubscribedEventSchema>;
export type MessageReceivedEvent = z.infer<typeof messageReceivedEventSchema>;
export type MessageSentEvent = z.infer<typeof messageSentEventSchema>;
export type MessageErrorEvent = z.infer<typeof messageErrorEventSchema>;
export type TypingStartedEvent = z.infer<typeof typingStartedEventSchema>;
export type TypingStoppedEvent = z.infer<typeof typingStoppedEventSchema>;
export type PresenceUpdateEvent = z.infer<typeof presenceUpdateEventSchema>;
