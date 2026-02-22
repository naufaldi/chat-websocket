import { z } from 'zod';

export const presenceSharingSchema = z.enum(['everyone', 'friends', 'nobody']);

// REST Response
export const userPresenceResponseSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'away', 'offline']),
  lastActivity: z.string().datetime().nullable(),
  lastSeenAt: z.string().datetime().nullable(),
});

export type PresenceSharing = z.infer<typeof presenceSharingSchema>;
export type UserPresenceResponse = z.infer<typeof userPresenceResponseSchema>;
