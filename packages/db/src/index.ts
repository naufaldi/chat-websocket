export * from './schema/index';

// Re-export inferred select types with descriptive names for repository use
import { messages, conversations, users } from './schema/index';

/** Message type as stored in database (with Date objects) */
export type Message = typeof messages.$inferSelect;

/** Conversation type as stored in database (with Date objects) */
export type Conversation = typeof conversations.$inferSelect;

/** User type as stored in database (with Date objects) */
export type User = typeof users.$inferSelect;
