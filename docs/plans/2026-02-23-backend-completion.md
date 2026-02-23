# Backend Implementation Plan

> **Status:** Ready for execution  
> **Approach:** Test-Driven Development (RED-GREEN-REFACTOR)  
> **Tasks:** 7 backend tasks  
> **Estimated Time:** 12-15 days

---

## Overview

This plan completes the remaining 7 backend tasks identified in the Reality Check audit. Each task follows strict TDD methodology.

### Execution Order (Respecting Dependencies)

1. **TASK-007:** Observability (infrastructure)
2. **TASK-009:** Rate Limiting (infrastructure)
3. **TASK-012:** Settings API (REST endpoints)
4. **TASK-008:** User Search improvements (REST endpoint enhancement)
5. **TASK-004:** Message Pagination (repository enhancement)
6. **TASK-006:** Presence System (Redis keyspace notifications)
7. **TASK-005:** Read Receipts (batching worker)

---

## TASK-007: Observability

**Status:** ~50% complete | **Priority:** Infrastructure

### Current State
- Basic health checks exist at `/api/health` and `/api/health/ready`
- Database connectivity check exists
- Redis connectivity check exists

### Requirements

#### 1. `/metrics` Endpoint with Prometheus Format
**Test Requirements:**
- Test that `/api/metrics` returns Prometheus-formatted metrics
- Test that metrics include HTTP request counts
- Test that metrics include HTTP request duration histograms
- Test that metrics include active WebSocket connections gauge
- Test that metrics include Node.js process metrics (memory, CPU)

**Acceptance Criteria:**
- `GET /api/metrics` returns text in Prometheus exposition format
- `http_requests_total` counter with labels: method, route, status
- `http_request_duration_seconds` histogram with labels: method, route
- `websocket_connections_active` gauge
- Metrics are collected automatically via middleware

**Files to Modify:**
- Create: `apps/server/src/metrics/metrics.controller.ts`
- Create: `apps/server/src/metrics/metrics.service.ts`
- Create: `apps/server/src/metrics/metrics.module.ts`
- Create: `apps/server/src/metrics/metrics.middleware.ts`
- Modify: `apps/server/src/app.module.ts` (register MetricsModule)

#### 2. Graceful Shutdown Hooks
**Test Requirements:**
- Test that on SIGTERM, active HTTP connections complete before shutdown
- Test that WebSocket connections are closed gracefully
- Test that Redis connections are properly closed
- Test that database pool is drained

**Acceptance Criteria:**
- Application listens for SIGTERM and SIGINT
- HTTP server keeps-alive timeout respected during shutdown
- WebSocket clients receive close event before server exits
- Exit code 0 on graceful shutdown

**Files to Modify:**
- Modify: `apps/server/src/main.ts`

---

## TASK-009: Rate Limiting

**Status:** ~60% complete | **Priority:** Infrastructure

### Current State
- ThrottlerModule is configured but not applied globally
- Custom ThrottlerWithHeadersGuard exists with X-RateLimit-* headers
- Only auth endpoints use rate limiting

### Requirements

#### 1. Redis-Based Distributed Rate Limiting
**Test Requirements:**
- Test that rate limit state is stored in Redis (not memory)
- Test that rate limits are shared across server instances
- Test that Redis failure falls back gracefully

**Acceptance Criteria:**
- Uses Redis for rate limit storage (ThrottlerStorageRedisService)
- Configurable via environment variables
- Graceful degradation if Redis unavailable

**Files to Modify:**
- Modify: `apps/server/src/app.module.ts`
- Install: `@nestjs/throttler` storage-redis adapter

#### 2. Global Rate Limit Guard
**Test Requirements:**
- Test that all endpoints without `@SkipThrottle()` have rate limiting
- Test that auth endpoints use stricter limits (existing behavior preserved)
- Test that ThrottlerWithHeadersGuard provides proper headers

**Acceptance Criteria:**
- Global guard applied in AppModule
- Default: 100 requests per minute for general endpoints
- Auth endpoints: 5 per 15 minutes (existing config)
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After

**Files to Modify:**
- Modify: `apps/server/src/app.module.ts`
- Use existing: `apps/server/src/auth/guards/throttler-headers.guard.ts`

#### 3. Per-Endpoint Rate Limit Configuration
**Test Requirements:**
- Test that `@Throttle()` decorator overrides defaults
- Test that `@SkipThrottle()` bypasses rate limiting for health checks

**Acceptance Criteria:**
- Health check endpoints use `@SkipThrottle()`
- WebSocket upgrade endpoint has higher limits
- Search endpoint has moderate limits (10 per minute)

**Files to Modify:**
- Modify: `apps/server/src/health/health.controller.ts`
- Modify: `apps/server/src/chat/chat.gateway.ts`
- Modify: `apps/server/src/users/users.controller.ts`

---

## TASK-012: Settings API

**Status:** ~40% complete | **Priority:** API

### Current State
- Users repository exists with basic CRUD
- No profile/privacy update endpoints

### Requirements

#### 1. PATCH /users/me - Update Profile
**Test Requirements:**
- Test that authenticated user can update displayName
- Test that authenticated user can update avatarUrl
- Test validation rejects empty displayName
- Test validation rejects invalid avatarUrl format
- Test non-authenticated request returns 401

**Acceptance Criteria:**
- `PATCH /api/users/me` accepts JSON body
- Optional fields: displayName (2-50 chars), avatarUrl (valid URL)
- At least one field required
- Returns updated user object (excluding passwordHash)
- Uses Zod validation

**Files to Modify:**
- Modify: `apps/server/src/users/users.controller.ts`
- Modify: `apps/server/src/users/users.service.ts` (create if doesn't exist)
- Modify: `apps/server/src/users/users.repository.ts`
- Create: Zod schema for UpdateProfileDto

#### 2. PATCH /users/me/privacy - Update Privacy Settings
**Test Requirements:**
- Test that presenceSharing can be updated ("everyone", "friends", "nobody")
- Test that readReceiptsEnabled can be updated (boolean)
- Test validation rejects invalid presenceSharing values
- Test non-authenticated request returns 401

**Acceptance Criteria:**
- `PATCH /api/users/me/privacy` accepts JSON body
- Fields: presenceSharing (enum), readReceiptsEnabled (boolean)
- At least one field required
- Returns updated privacy settings
- Uses Zod validation

**Files to Modify:**
- Modify: `apps/server/src/users/users.controller.ts`
- Modify: `apps/server/src/users/users.service.ts`
- Modify: `apps/server/src/users/users.repository.ts`
- Create: Zod schema for UpdatePrivacyDto

#### 3. Users Service Layer
**Test Requirements:**
- Test that UsersService methods delegate to repository
- Test business logic for privacy setting validation

**Acceptance Criteria:**
- Create `UsersService` if it doesn't exist
- Methods: updateProfile(userId, data), updatePrivacy(userId, data)
- Controller uses service, not repository directly

**Files to Modify:**
- Create: `apps/server/src/users/users.service.ts` (if not exists)
- Modify: `apps/server/src/users/users.module.ts`
- Modify: `apps/server/src/users/users.controller.ts`

---

## TASK-008: User Search Improvements

**Status:** ~85% complete | **Priority:** API Enhancement

### Current State
- Search endpoint exists and works
- No rate limiting on search
- Controller calls repository directly

### Requirements

#### 1. Add Rate Limiting to Search Endpoint
**Test Requirements:**
- Test that search endpoint has rate limiting
- Test that 10+ searches per minute returns 429

**Acceptance Criteria:**
- `GET /api/users/search` has `@Throttle(10, 60)` (10 per minute)
- Returns 429 with Retry-After header when limit exceeded

**Files to Modify:**
- Modify: `apps/server/src/users/users.controller.ts`

#### 2. Add UsersService.search() Method
**Test Requirements:**
- Test that UsersService.search() delegates to repository
- Test that controller uses service instead of repository

**Acceptance Criteria:**
- `UsersService.search(query, excludeUserId, limit)` method exists
- Returns same results as repository.searchPublicUsers()
- Controller uses service method

**Files to Modify:**
- Modify: `apps/server/src/users/users.service.ts`
- Modify: `apps/server/src/users/users.controller.ts`

---

## TASK-004: Message Pagination

**Status:** ~70% complete | **Priority:** Repository Enhancement

### Current State
- Limit-based pagination exists (50 messages default)
- `_cursor` parameter exists but is unused
- No cursor-based pagination logic

### Requirements

#### 1. Cursor-Based Pagination with Base64 Encoded Tuple
**Test Requirements:**
- Test that `?cursor=<base64>` returns messages after cursor position
- Test that response includes `nextCursor` for fetching more
- Test that `nextCursor` is null when no more messages
- Test that invalid cursor format returns 400
- Test cursor encodes tuple of (createdAt, id)

**Acceptance Criteria:**
- `GET /api/conversations/:id/messages?cursor=<base64>` works
- Cursor format: base64(JSON.stringify([createdAt, messageId]))
- Returns messages sorted by createdAt DESC, id DESC
- Response includes pagination metadata:
  ```json
  {
    "data": [...],
    "pagination": {
      "nextCursor": "base64string...",
      "hasMore": true
    }
  }
  ```

**Files to Modify:**
- Modify: `apps/server/src/messages/messages.controller.ts`
- Modify: `apps/server/src/messages/messages.service.ts`
- Modify: `apps/server/src/messages/messages.repository.ts`

#### 2. Transaction Wrapping for Message Creation
**Test Requirements:**
- Test that message INSERT and conversation lastMessage update are atomic
- Test that if conversation update fails, message is not saved
- Test transaction rollback on error

**Acceptance Criteria:**
- `createMessage()` uses database transaction
- Within transaction:
  1. Insert message
  2. Update conversation's `lastMessageId` and `lastMessageAt`
- Both succeed or both fail

**Files to Modify:**
- Modify: `apps/server/src/messages/messages.repository.ts`

---

## TASK-006: Presence System

**Status:** ~60% complete | **Priority:** Redis Feature

### Current State
- REST presence endpoint exists
- Redis-based presence in chat module exists
- No keyspace notifications for expiry detection

### Requirements

#### 1. Redis Keyspace Notifications for Presence Expiry
**Test Requirements:**
- Test that when presence key expires in Redis, offline event is broadcast
- Test keyspace notification subscription works
- Test only presence keys trigger events (not other Redis keys)

**Acceptance Criteria:**
- Subscribe to Redis `__keyevent@0__:expired` notifications
- Filter for keys matching `presence:*` pattern
- When presence key expires, broadcast `presence:offline` to relevant users
- Works with existing presence TTL mechanism

**Files to Modify:**
- Modify: `apps/server/src/chat/presence.service.ts`

#### 2. Multi-Device Redis Schema
**Test Requirements:**
- Test that single user with multiple devices has separate presence keys
- Test that user is only offline when ALL devices expire

**Acceptance Criteria:**
- Redis key format: `presence:{userId}:{deviceId}`
- Device ID generated from socket connection ID or client-provided
- User is online if ANY device key exists
- User is offline when ALL device keys expired

**Files to Modify:**
- Modify: `apps/server/src/chat/presence.service.ts`
- Modify: `apps/server/src/presence/presence.service.ts` (REST service)

---

## TASK-005: Read Receipts Batching

**Status:** ~60% complete | **Priority:** Background Worker

### Current State
- Individual read receipts work (direct DB write)
- Comment mentions batching but no implementation

### Requirements

#### 1. Group Read Receipt Batching with Redis Counter
**Test Requirements:**
- Test that marking message read in group chat increments Redis counter
- Test that no database write happens immediately for group chats
- Test that 1:1 chats still write directly to database

**Acceptance Criteria:**
- For group chats (3+ participants):
  - Increment Redis counter: `read_count:{messageId}`
  - Add to batch set: `read_batch:{messageId}` with userId
  - Do NOT write to database immediately
- For 1:1 chats:
  - Existing behavior preserved (direct DB write)

**Files to Modify:**
- Modify: `apps/server/src/read-receipts/read-receipts.service.ts`

#### 2. @Interval Batch Worker for Read Receipts
**Test Requirements:**
- Test that worker runs every 10 seconds
- Test that worker flushes batched read receipts to database
- Test that worker deletes Redis keys after successful flush
- Test partial failure handling (some succeed, some fail)

**Acceptance Criteria:**
- `@Interval(10000)` decorator on worker method
- Query Redis for all `read_batch:*` keys
- For each batch:
  - Get all userIds from set
  - Bulk INSERT to read_receipts table
  - Delete Redis keys after successful insert
- Logging for batch operations

**Files to Modify:**
- Modify: `apps/server/src/read-receipts/read-receipts.service.ts`
- Modify: `apps/server/src/read-receipts/read-receipts.module.ts` (add ScheduleModule)

---

## TDD Workflow for Each Task

### For Every Task:

1. **RED - Write Failing Test**
   - Create test file alongside source (e.g., `metrics.service.test.ts`)
   - Write minimal test showing expected behavior
   - Run test, verify it fails for expected reason

2. **GREEN - Minimal Implementation**
   - Write simplest code to pass the test
   - No additional features or refactoring

3. **REFACTOR - Clean Up**
   - Remove duplication
   - Improve naming
   - Keep tests green

4. **Commit**
   - Conventional commit format: `feat(scope): description`

### Test File Locations

Place tests alongside source files:
- `metrics.service.ts` → `metrics.service.test.ts`
- `users.controller.ts` → `users.controller.test.ts`

### Verification Commands

After each task:
```bash
# Run tests for modified files
bun test apps/server/src/<path>/<file>.test.ts

# Type check
bun run typecheck

# Lint
bun run lint

# Verify Swagger
# Open http://localhost:3000/api/docs
```

---

## Final Verification Checklist

Before claiming complete:
- [ ] Every new function has a test that FAILED first
- [ ] All tests pass (`bun run test`)
- [ ] Type check passes (`bun run typecheck`)
- [ ] Lint passes (`bun run lint`)
- [ ] Swagger docs verified at `/api/docs`
- [ ] Manual end-to-end verification complete
- [ ] No code in plan file (all code in source files)
