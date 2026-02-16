# AGENTS.md - Database Schema Developer Guide

> See root `AGENTS.md` for monorepo overview and superpowers skills.

## Package Info

- **Name**: `@chat/db`
- **Location**: `packages/db`
- **ORM**: Drizzle ORM 0.45.x

## Commands

```bash
# Generate migrations from schema
bun run generate

# Push schema to database
bun run push

# Run migrations
bun run migrate

# Bun-specific
bunx drizzle-kit generate
bunx drizzle-kit push
bunx drizzle-kit migrate
```

## Schema Files

```
packages/db/src/
├── schema/
│   └── index.ts    # All table definitions
└── index.ts        # Exports
```

## Table Definitions

```typescript
// ✅ Good: Complete table with indexes
import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core';

// Enums
export const messageStatusEnum = pgEnum('message_status', ['sending', 'delivered', 'read', 'error']);

// Table
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  clientMessageId: varchar('client_message_id', { length: 64 }).unique(),
  status: messageStatusEnum('status').default('delivered').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes
  clientIdIdx: uniqueIndex('idx_messages_client_id').on(table.clientMessageId),
  convCreatedIdx: index('idx_messages_conversation_created').on(table.conversationId, table.createdAt.desc()),
}));
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Table | snake_case | `users`, `conversation_participants` |
| Column | snake_case | `user_id`, `created_at` |
| Index | idx_{table}_{column} | `idx_messages_conversation_created` |
| Enum | snake_case | `message_status` |
| Foreign Key | {table}_id | `conversation_id` |

## Key Patterns

### UUID Primary Keys

```typescript
// ✅ Good: UUID for distributed systems
id: uuid('id').defaultRandom().primaryKey()

// ❌ Bad: Serial for distributed systems (unless using snowflake)
id: serial('id').primaryKey()
```

### Soft Deletes

```typescript
// ✅ Good: Soft delete with deleted_at
deletedAt: timestamp('deleted_at', { withTimezone: true }),

// Query always filters:
import { isNull } from 'drizzle-orm';
const activeMessages = await db
  .select()
  .from(messages)
  .where(isNull(messages.deletedAt));
```

### Cursor-Based Pagination

```typescript
// ✅ Good: Composite cursor (timestamp + id) for tie-breaking
convCreatedIdx: index('idx_messages_conversation_created')
  .on(table.conversationId, table.createdAt.desc()),
```

### Timestamps

```typescript
// ✅ Good: Always use withTimezone for timestamps
createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
```

## Migrations

Generate migration after schema changes:
```bash
bun run generate
```

This creates SQL files in `packages/db/migrations/`.

## Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
```
