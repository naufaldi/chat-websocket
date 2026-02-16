# Database Schema Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete database layer with PostgreSQL connection, repositories, and shared Zod schemas for MVP 1.

**Architecture:** Create `packages/shared` for Zod schemas, connect to local PostgreSQL, implement database module with connection pooling, and create repository pattern for data access.

**Tech Stack:** PostgreSQL 15, Drizzle ORM 0.45.x, Zod 4.x

---

## Phase 1: Setup Local PostgreSQL

### Task 1.1: Configure Environment for Local PostgreSQL

**Files:**
- Create: `.env.example`
- Create: `.env` (local development)

**Prerequisites:**
- PostgreSQL 15+ installed locally
- Database `chat_db` created
- User `chat` with password `chat_password`

**Step 1: Create .env.example**

```
# Database
DATABASE_URL=postgresql://chat:chat_password@localhost:5432/chat_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m

# Server
PORT=3000
NODE_ENV=development

# Client
CLIENT_URL=http://localhost:5173
```

**Step 2: Create local .env file**

Run: `cp .env.example .env`

**Step 3: Verify PostgreSQL connection**

Run: `psql postgresql://chat:chat_password@localhost:5432/chat_db -c "SELECT 1;"`
Expected: `?column? 
----------
        1
(1 row)`

**Step 4: Commit**

```bash
git add .env.example
git commit -m "feat: add environment configuration template"
```

**Note:** Docker Compose will be added later for VPS deployment (MVP1-008).

---

## Phase 2: Create Shared Package with Zod Schemas

### Task 2.1: Setup packages/shared Structure

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@chat/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create packages/shared/src/index.ts**

```typescript
// Export all schemas
export * from './schemas/auth.js';
export * from './schemas/user.js';
export * from './schemas/message.js';
export * from './schemas/conversation.js';
```

**Step 4: Install dependencies**

Run: `cd packages/shared && bun install`
Expected: Dependencies installed successfully

**Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: setup shared package structure"
```

---

### Task 2.2: Create Auth Schemas

**Files:**
- Create: `packages/shared/src/schemas/auth.ts`

**Step 1: Create auth.ts with Zod schemas**

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
```

**Step 2: Commit**

```bash
git add packages/shared/src/schemas/auth.ts
git commit -m "feat: add auth Zod schemas"
```

---

### Task 2.3: Create User Schemas

**Files:**
- Create: `packages/shared/src/schemas/user.ts`

**Step 1: Create user.ts**

```typescript
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const userPublicSchema = userSchema.omit({
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export type User = z.infer<typeof userSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
```

**Step 2: Commit**

```bash
git add packages/shared/src/schemas/user.ts
git commit -m "feat: add user Zod schemas"
```

---

### Task 2.4: Create Message Schemas

**Files:**
- Create: `packages/shared/src/schemas/message.ts`

**Step 1: Create message.ts**

```typescript
import { z } from 'zod';

export const messageStatusSchema = z.enum(['sending', 'delivered', 'read', 'error']);
export const contentTypeSchema = z.enum(['text', 'image', 'file']);

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  contentType: contentTypeSchema,
  clientMessageId: z.string().nullable(),
  status: messageStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
```

**Step 2: Commit**

```bash
git add packages/shared/src/schemas/message.ts
git commit -m "feat: add message Zod schemas"
```

---

### Task 2.5: Create Conversation Schemas

**Files:**
- Create: `packages/shared/src/schemas/conversation.ts`

**Step 1: Create conversation.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/shared/src/schemas/conversation.ts
git commit -m "feat: add conversation Zod schemas"
```

---

## Phase 3: Update Database Package

### Task 3.1: Update packages/db to use @chat/shared

**Files:**
- Modify: `packages/db/package.json`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Update package.json**

```json
{
  "name": "@chat/db",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "push": "drizzle-kit push"
  },
  "dependencies": {
    "@chat/shared": "workspace:*",
    "drizzle-orm": "^0.45.1",
    "pg": "^8.18.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.9",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Update schema/index.ts to export types from shared**

Add to bottom of file:
```typescript
// Re-export types from shared package
export type { 
  User, 
  UserPublic,
  Message, 
  SendMessageInput,
  Conversation, 
  CreateConversationInput,
  RegisterInput,
  LoginInput
} from '@chat/shared';
```

**Step 3: Install dependencies**

Run: `cd packages/db && bun install`
Expected: @chat/shared linked successfully

**Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: link @chat/shared to @chat/db"
```

---

## Phase 4: Create Database Module in Server

### Task 4.1: Create Database Connection Module

**Files:**
- Create: `apps/server/src/database/database.module.ts`
- Create: `apps/server/src/database/database.service.ts`

**Step 1: Create database.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@chat/db/schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
```

**Step 2: Create database.service.ts**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from './database.module';

@Injectable()
export class DatabaseService {
  constructor(@Inject(DRIZZLE) public readonly db: any) {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

**Step 3: Commit**

```bash
git add apps/server/src/database/
git commit -m "feat: add database module with connection pooling"
```

---

### Task 4.2: Create User Repository

**Files:**
- Create: `apps/server/src/users/users.repository.ts`

**Step 1: Create users.repository.ts**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { users } from '@chat/db/schema';
import type { RegisterInput } from '@chat/shared';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || null;
  }

  async findByUsername(username: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  async create(data: RegisterInput & { passwordHash: string }) {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
      })
      .returning();
    return user;
  }

  async updateLastSeen(id: string) {
    await this.db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, id));
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/users/
git commit -m "feat: add users repository"
```

---

### Task 4.3: Create Message Repository

**Files:**
- Create: `apps/server/src/messages/messages.repository.ts`

**Step 1: Create messages.repository.ts**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { messages } from '@chat/db/schema';
import type { SendMessageInput } from '@chat/shared';

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findById(id: string) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return message || null;
  }

  async findByConversation(conversationId: string, limit = 50, cursor?: string) {
    let query = this.db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    if (cursor) {
      // Add cursor-based pagination logic here
      query = query.where(desc(messages.createdAt) < cursor);
    }

    return query;
  }

  async findByClientMessageId(clientMessageId: string) {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.clientMessageId, clientMessageId))
      .limit(1);
    return message || null;
  }

  async create(data: SendMessageInput & { senderId: string }) {
    const [message] = await this.db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        contentType: data.contentType,
        clientMessageId: data.clientMessageId,
        replyToId: data.replyToId || null,
      })
      .returning();
    return message;
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/messages/
git commit -m "feat: add messages repository"
```

---

### Task 4.4: Create Conversation Repository

**Files:**
- Create: `apps/server/src/conversations/conversations.repository.ts`

**Step 1: Create conversations.repository.ts**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { conversations, conversationParticipants } from '@chat/db/schema';
import type { CreateConversationInput } from '@chat/shared';

@Injectable()
export class ConversationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findById(id: string) {
    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return conversation || null;
  }

  async findByUser(userId: string, limit = 20, cursor?: string) {
    // Get conversation IDs where user is participant
    const participantRows = await this.db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = participantRows.map((p: any) => p.conversationId);

    if (conversationIds.length === 0) return [];

    return this.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  }

  async create(data: CreateConversationInput, createdBy: string) {
    return this.db.transaction(async (tx: any) => {
      // Create conversation
      const [conversation] = await tx
        .insert(conversations)
        .values({
          type: data.type,
          title: data.title || null,
          createdBy,
        })
        .returning();

      // Add participants
      await tx.insert(conversationParticipants).values(
        data.participantIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: userId === createdBy ? 'owner' : 'member',
        }))
      );

      return conversation;
    });
  }

  async isUserParticipant(conversationId: string, userId: string) {
    const [participant] = await this.db
      .select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ))
      .limit(1);
    return !!participant;
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/conversations/
git commit -m "feat: add conversations repository"
```

---

## Phase 5: Run Migrations

### Task 5.1: Generate and Run Initial Migration

**Files:**
- Create: `packages/db/migrations/` (generated)

**Step 1: Generate migration**

Run: `cd packages/db && bun run generate`
Expected: Migration file created in `packages/db/migrations/`

**Step 2: Run migration**

Run: `cd packages/db && bun run migrate`
Expected: Tables created in PostgreSQL

**Step 3: Verify tables**

Run: `docker exec chat-postgres psql -U chat -d chat_db -c "\dt"`
Expected: List of tables including users, conversations, messages, etc.

**Step 4: Commit**

```bash
git add packages/db/migrations/
git commit -m "feat: add initial database migration"
```

---

## Phase 6: Verification

### Task 6.1: Test Database Connection

**Files:**
- Create: `apps/server/src/health/health.controller.ts`

**Step 1: Create health controller**

```typescript
import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get()
  async check() {
    const dbHealthy = await this.dbService.healthCheck();
    return {
      status: dbHealthy ? 'ok' : 'error',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
```

**Step 2: Add to app.module.ts**

```typescript
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  // ... rest of module
})
```

**Step 3: Start server and test**

Run: `cd apps/server && bun run dev`
In another terminal: `curl http://localhost:3000/health`
Expected: `{ "status": "ok", "database": "connected", ... }`

**Step 4: Commit**

```bash
git add apps/server/src/health/
git commit -m "feat: add health check endpoint"
```

---

## Summary

After completing this plan:

1. ✅ PostgreSQL running in Docker
2. ✅ `packages/shared` with Zod schemas
3. ✅ `packages/db` linked to shared package
4. ✅ Database module with connection pooling
5. ✅ Repository pattern for users, messages, conversations
6. ✅ Initial migration applied
7. ✅ Health check endpoint working

**Next:** Authentication System (MVP1-002)

---

**Plan complete and saved to `docs/plans/2024-02-16-database-schema-implementation.md`.**

**Execution options:**
1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task
2. **Parallel Session (separate)** - Open new session with executing-plans

**Which approach?**
