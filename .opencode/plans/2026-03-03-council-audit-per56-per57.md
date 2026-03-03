# PER-56 & PER-57 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement real unread count in conversation list and complete presence privacy logic for contacts

**Architecture:**
- **PER-56 (Unread Count)**: Use `lastReadMessageId` from `conversationParticipants` table to count messages created after user's last read position
- **PER-57 (Presence Privacy)**: Create a contacts/friends relationship table and implement privacy check for presence endpoint

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Socket.io

---

## Task 1: PER-56 - Implement Real Unread Count

### Files:
- Modify: `apps/server/src/conversations/conversations.service.ts:62`
- Modify: `apps/server/src/conversations/conversations.repository.ts`
- Test: `apps/server/src/conversations/conversations.service.test.ts`

### Step 1: Add method to get unread count in repository

**File:** `apps/server/src/conversations/conversations.repository.ts`

Add method to count messages after user's last read position:

```typescript
async getUnreadCount(conversationId: string, userId: string): Promise<number> {
  // Get user's last read message from conversationParticipants
  const [participant] = await this.db
    .select({ lastReadMessageId: conversationParticipants.lastReadMessageId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (!participant?.lastReadMessageId) {
    // No read position - count all messages
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    return result?.count ?? 0;
  }

  // Count messages created after last read
  const lastReadMessage = await this.db
    .select({ createdAt: messages.createdAt })
    .from(messages)
    .where(eq(messages.id, participant.lastReadMessageId))
    .limit(1);

  if (!lastReadMessage[0]) {
    return 0;
  }

  const [result] = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        gt(messages.createdAt, lastReadMessage[0].createdAt),
      ),
    );

  return result?.count ?? 0;
}
```

### Step 2: Write failing test

**File:** `apps/server/src/conversations/conversations.service.test.ts`

```typescript
describe('findAllByUser', () => {
  it('should return unread count for each conversation', async () => {
    const mockConversations = [{
      id: 'conv-1',
      type: 'direct' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }];
    
    mockRepository.findByUserPaginated.mockResolvedValue({
      conversations: mockConversations,
      nextCursor: null,
    });
    mockRepository.findParticipants.mockResolvedValue([{
      userId: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      lastSeenAt: new Date(),
    }]);
    mockRepository.getLastMessage.mockResolvedValue(null);
    mockRepository.getParticipantCount.mockResolvedValue(2);
    mockRepository.getUnreadCount.mockResolvedValue(5); // Mock unread count
    
    const result = await service.findAllByUser('user-1', undefined, 20);
    
    expect(result.conversations[0].unreadCount).toBe(5);
  });
});
```

### Step 3: Run test to verify it fails

```bash
cd apps/server && bun test src/conversations/conversations.service.test.ts
```

Expected: FAIL - `getUnreadCount` method not defined

### Step 4: Implement getUnreadCount in repository

Add the method to `ConversationsRepository` class.

### Step 5: Update service to call getUnreadCount

**File:** `apps/server/src/conversations/conversations.service.ts:62`

Replace:
```typescript
unreadCount: 0, // TODO: Implement unread count
```

With:
```typescript
unreadCount: await this.repository.getUnreadCount(conv.id, userId),
```

### Step 6: Run test to verify it passes

```bash
cd apps/server && bun test src/conversations/conversations.service.test.ts
```

Expected: PASS

### Step 7: Commit

```bash
git add apps/server/src/conversations/
git commit -m "feat(conversations): implement real unread count

- Add getUnreadCount method to ConversationsRepository
- Update findAllByUser to calculate actual unread messages
- Add tests for unread count calculation"
```

---

## Task 2: PER-57 - Complete Presence Privacy Logic

### Files:
- Create: `packages/db/src/schema/friends.ts` (friends/contacts table)
- Modify: `packages/db/src/schema/index.ts` (export friends table)
- Modify: `apps/server/src/presence/presence.service.ts:66-68`
- Create: `apps/server/src/friends/friends.repository.ts`
- Create: `apps/server/src/friends/friends.service.ts`
- Create: `apps/server/src/friends/friends.module.ts`
- Test: `apps/server/src/presence/presence.service.test.ts`

### Step 1: Create friends/contacts schema

**File:** `packages/db/src/schema/friends.ts`

```typescript
import { pgTable, uuid, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './index';

export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'rejected']);

export const friends = pgTable('friends', {
  id: uuid('id').defaultRandom().primaryKey(),
  requesterId: uuid('requester_id').references(() => users.id).notNull(),
  addresseeId: uuid('addressee_id').references(() => users.id).notNull(),
  status: friendshipStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  requesterAddresseeIdx: uniqueIndex('idx_friends_requester_addressee')
    .on(table.requesterId, table.addresseeId),
  addresseeIdx: index('idx_friends_addressee').on(table.addresseeId),
  statusIdx: index('idx_friends_status').on(table.status),
}));
```

### Step 2: Export friends table

**File:** `packages/db/src/schema/index.ts`

Add export:
```typescript
export * from './friends';
```

### Step 3: Generate migration

```bash
cd packages/db && bun run generate
```

### Step 4: Create FriendsRepository

**File:** `apps/server/src/friends/friends.repository.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { friends } from '@chat/db';
import { eq, and, or } from 'drizzle-orm';

@Injectable()
export class FriendsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const [friendship] = await this.db
      .select({ id: friends.id })
      .from(friends)
      .where(
        and(
          eq(friends.status, 'accepted'),
          or(
            and(
              eq(friends.requesterId, userId1),
              eq(friends.addresseeId, userId2),
            ),
            and(
              eq(friends.requesterId, userId2),
              eq(friends.addresseeId, userId1),
            ),
          ),
        ),
      )
      .limit(1);

    return !!friendship;
  }
}
```

### Step 5: Create FriendsModule

**File:** `apps/server/src/friends/friends.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { FriendsRepository } from './friends.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FriendsRepository],
  exports: [FriendsRepository],
})
export class FriendsModule {}
```

### Step 6: Add friends module to presence module

**File:** `apps/server/src/presence/presence.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [FriendsModule],
  controllers: [PresenceController],
  providers: [PresenceService],
})
export class PresenceModule {}
```

### Step 7: Write failing test for privacy

**File:** `apps/server/src/presence/presence.service.test.ts`

```typescript
describe('getUserPresence with privacy', () => {
  it('should return offline when presenceSharing is contacts and requester is not a contact', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{
            id: 'user-1',
            lastSeenAt: new Date(),
            presenceEnabled: true,
            presenceSharing: 'contacts',
          }]),
        }),
      }),
    }));
    
    mockFriendsRepository.areFriends.mockResolvedValue(false);
    
    const result = await service.getUserPresence('user-1', 'requester-1');
    
    expect(result.status).toBe('offline');
  });

  it('should return online when presenceSharing is contacts and requester is a contact', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{
            id: 'user-1',
            lastSeenAt: new Date(),
            presenceEnabled: true,
            presenceSharing: 'contacts',
          }]),
        }),
      }),
    }));
    
    mockFriendsRepository.areFriends.mockResolvedValue(true);
    
    const result = await service.getUserPresence('user-1', 'requester-1');
    
    expect(result.status).toBe('online');
  });
});
```

### Step 8: Run test to verify it fails

```bash
cd apps/server && bun test src/presence/presence.service.test.ts
```

Expected: FAIL - privacy logic not implemented

### Step 9: Implement privacy check in PresenceService

**File:** `apps/server/src/presence/presence.service.ts`

Update imports and constructor:
```typescript
import { FriendsRepository } from '../friends/friends.repository';

@Injectable()
export class PresenceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly friendsRepository: FriendsRepository,
  ) {}
```

Update getUserPresence method (replace lines 66-68):
```typescript
// Check if requester is a contact when sharing is 'contacts'
if (user.presenceSharing === 'contacts') {
  const isContact = await this.friendsRepository.areFriends(userId, requesterId);
  if (!isContact) {
    return {
      userId: user.id,
      status: 'offline' as const,
      lastActivity: null,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }
}
```

### Step 10: Run test to verify it passes

```bash
cd apps/server && bun test src/presence/presence.service.test.ts
```

Expected: PASS

### Step 11: Commit

```bash
git add packages/db/src/schema/friends.ts apps/server/src/friends/ apps/server/src/presence/
git commit -m "feat(presence): implement privacy logic for contacts

- Add friends table schema for contact relationships
- Implement areFriends check in PresenceService
- Return offline when privacy is 'contacts' and requester is not a contact
- Add tests for privacy enforcement"
```

---

## Verification Commands

After completing both tasks, run:

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Server tests
cd apps/server && bun test
```

---

## Execution Choice

**Plan complete and saved to `.opencode/plans/2026-03-03-council-audit-per56-per57.md`. Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
