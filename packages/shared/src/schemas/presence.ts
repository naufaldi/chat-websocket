import { z } from 'zod';

/**
 * Presence sharing and profile photo visibility use the same enum values.
 * RFC alignment: 'contacts' instead of 'friends' for consistency.
 */
export const presenceSharingSchema = z.enum(['everyone', 'contacts', 'nobody']);

// REST Response
export const userPresenceResponseSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'away', 'offline']),
  lastActivity: z.string().datetime().nullable(),
  lastSeenAt: z.string().datetime().nullable(),
});

export type PresenceSharing = z.infer<typeof presenceSharingSchema>;
export type UserPresenceResponse = z.infer<typeof userPresenceResponseSchema>;
