# Chat System Implementation Tickets

> **Project:** Real-time Chat System (Three-Second Problem)  
> **Tech Stack:** NestJS 11.x + Drizzle 0.45.x + PostgreSQL + Redis + Socket.io 4.x + Bun Workspaces Monorepo  
> **Frontend:** React 19.x + Vite 7.x + TanStack Query 5.x + Tailwind 4.x + TypeScript 5.x  
> **Deployment:** VPS (Docker Compose)  
> **Build:** Turborepo 2.x  
> **Last Updated:** 2024-01-15

---

## 📋 Quick Reference

| Phase | Tickets | Status | Est. Sprint |
|-------|---------|--------|-------------|
| **Setup** | 1 ticket | Ready | 1 week |
| **MVP 1** | 8 tickets | Ready | 4-6 weeks |
| **MVP 2** | 4 tickets | Ready | 2-3 weeks |
| **MVP 3** | 4 tickets | Ready | 2-3 weeks |

---

## 🎯 Setup: Monorepo Infrastructure

### Ticket SETUP-001: Monorepo Setup
**Type:** DevOps | **Priority:** 🔴 Critical | **Story Points:** 3

**User Story:**
As a developer, I need a monorepo structure so that backend and frontend can share code and be developed together.

**Acceptance Criteria:**
- [x] Bun workspaces configured in root `package.json`
- [x] `apps/server` - NestJS 11.x application
- [x] `apps/web` - React 19.x + Vite 7.x application  
- [x] `packages/shared` - Shared types, Zod schemas, utilities
- [x] `packages/db` - Drizzle 0.45.x schema, migrations, queries
- [x] TypeScript project references configured
- [x] Root scripts: `build`, `dev`, `lint`, `test`, `typecheck`
- [x] Cross-package imports resolved correctly
- [ ] ESLint + Prettier shared config (TODO)

**Related Docs:**
- [Bun Workspaces](https://bun.sh/docs/pm/workspaces)
- [Turborepo](https://turbo.build/repo)
- [NestJS Monorepo Guide](https://docs.nestjs.com/cli/monorepo)

---

## 🎯 MVP 1: Basic Chat + Message Storage

### Ticket MVP1-001: Database Schema Implementation
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 5

**User Story:**
As a developer, I need a complete database schema so that messages and user data can be persisted reliably.

**Acceptance Criteria:**
- [ ] All 5 tables created (users, conversations, conversation_participants, messages, read_receipts)
- [ ] All indexes applied for query performance
- [ ] Drizzle ORM schema files created
- [ ] Initial migration generated and tested
- [ ] Soft delete implemented with `deleted_at` columns
- [ ] UUID primary keys working correctly

**Technical Notes:**
- Use Drizzle Kit for migrations
- PostgreSQL 15+ required
- Connection pooling configured (min: 5, max: 20)
- Schema defined in `packages/database`
- Zod schemas auto-generated in `packages/shared`

**Definition of Done:**
- [ ] Schema matches RFC document exactly
- [ ] Migration runs successfully on fresh database
- [ ] Rollback migration tested
- [ ] Integration tests pass

**Related Docs:**
- [RFC Database Schema](rfc-database-schema.md)

---

### Ticket MVP1-002: Authentication System
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 8

**User Story:**
As a user, I want to register and login securely so that I can access my conversations.

**Acceptance Criteria:**
- [ ] User registration endpoint (`POST /auth/register`)
- [ ] User login endpoint (`POST /auth/login`)
- [ ] JWT access token generation (15-min expiry)
- [ ] JWT refresh token with rotation (7-day expiry, HTTP-only cookie)
- [ ] Password hashing with Argon2id
- [ ] Token blacklist on logout
- [ ] Input validation with Zod schemas

**Technical Notes:**
- Use `@nestjs/jwt` and `@nestjs/passport`
- Store refresh tokens in Redis
- Implement token reuse detection
- Rate limit: 5 attempts per 15 min
- Use `@chat/shared` for Zod validation schemas

**Definition of Done:**
- [ ] All auth endpoints working
- [ ] Passwords never stored in plain text
- [ ] Token rotation tested
- [ ] Security headers applied (Helmet)

**Related Docs:**
- [RFC Authentication](rfc-authentication.md)
- [RFC REST API](rfc-rest-api.md)

---

### Ticket MVP1-003: REST API - Conversations
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 5

**User Story:**
As a user, I want to create and manage conversations so that I can chat with others.

**Acceptance Criteria:**
- [ ] `GET /conversations` - List with cursor pagination
- [ ] `POST /conversations` - Create new conversation
- [ ] `GET /conversations/:id` - Get conversation details
- [ ] `DELETE /conversations/:id` - Soft delete (owner only)
- [ ] `GET /conversations/:id/messages` - Message history with pagination
- [ ] `POST /conversations/:id/messages` - Send message (HTTP fallback)
- [ ] Authorization: Only participants can access

**Technical Notes:**
- Cursor-based pagination (not offset)
- Default page size: 50, max: 100
- Include sender details to avoid N+1 queries

**Definition of Done:**
- [ ] All endpoints return correct response format
- [ ] Pagination working with cursors
- [ ] 403 returned for non-participants
- [ ] Rate limiting applied

**Related Docs:**
- [RFC REST API](rfc-rest-api.md)

---

### Ticket MVP1-004: WebSocket Gateway Setup
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 8

**User Story:**
As a user, I want real-time message delivery so that I can chat without refreshing.

**Acceptance Criteria:**
- [ ] WebSocket server running on `/chat` namespace
- [ ] JWT authentication on connection (query param)
- [ ] `auth:success` / `auth:error` events
- [ ] `subscribe` / `unsubscribe` conversation rooms
- [ ] `message:send` / `message:sent` / `message:received` events
- [ ] `typing:start` / `typing:stop` events
- [ ] Heartbeat handling (15s interval, 30s TTL)

**Technical Notes:**
- Use `@nestjs/websockets` with Socket.io
- Store socket mappings in memory (Map<userId, Socket[]>)
- Rate limit: 30 messages/min per user
- Validate all events with Zod

**Definition of Done:**
- [ ] WebSocket connects with valid JWT
- [ ] Messages broadcast to room participants
- [ ] Typing indicators working
- [ ] Reconnection handled gracefully

**Related Docs:**
- [RFC WebSocket Protocol](rfc-websocket-protocol.md)

---

### Ticket MVP1-005: Write-Through Message Storage
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 8

**User Story:**
As a user, I want my messages to be saved reliably so that I never lose them.

**Acceptance Criteria:**
- [ ] Message saved to PostgreSQL before confirmation
- [ ] Database transaction wraps INSERT + UPDATE
- [ ] `message:sent` confirmation only after DB commit
- [ ] `clientMessageId` deduplication (5-min window)
- [ ] Retry logic for DB failures (3 attempts)
- [ ] Redis Pub/Sub for cross-server broadcast
- [ ] Performance: p95 < 500ms

**Technical Notes:**
- Use Drizzle transactions
- Redis key: `dedup:{clientMessageId}` (5-min TTL)
- Publish to `chat:{conversationId}` channel
- Log all message events with latency

**Definition of Done:**
- [ ] No message lost in testing
- [ ] Duplicate messages prevented
- [ ] Latency metrics logged
- [ ] Failure scenarios tested

**Related Docs:**
- [RFC Message Storage](rfc-message-storage.md)

---

### Ticket MVP1-006: Frontend - Auth Pages
**Type:** Frontend | **Priority:** 🔴 Critical | **Story Points:** 5

**User Story:**
As a user, I want to register and login through a web interface so that I can start chatting.

**Acceptance Criteria:**
- [ ] Login page with email/password
- [ ] Registration page with validation
- [ ] JWT stored in localStorage (access) and cookie (refresh)
- [ ] Automatic token refresh before expiry
- [ ] Redirect to chat after login
- [ ] Logout functionality
- [ ] Form validation with error messages

**Technical Notes:**
- Use React Hook Form + Zod
- TanStack Query for API calls
- Axios interceptors for token refresh
- Protected route wrapper
- Use `@chat/shared` for API response types

**Definition of Done:**
- [ ] All auth flows working end-to-end
- [ ] Token refresh seamless to user
- [ ] Error messages user-friendly
- [ ] Mobile responsive

---

### Ticket MVP1-007: Frontend - Chat Interface
**Type:** Frontend | **Priority:** 🔴 Critical | **Story Points:** 13

**User Story:**
As a user, I want a chat interface so that I can send and receive messages in real-time.

**Acceptance Criteria:**
- [ ] Conversation list sidebar
- [ ] Chat window with message bubbles
- [ ] Message input with send button
- [ ] WebSocket connection management
- [ ] Optimistic UI for message sending
- [ ] Message status indicators (sending, delivered)
- [ ] Infinite scroll for message history
- [ ] Typing indicators
- [ ] Mobile responsive layout

**Technical Notes:**
- Use Socket.io-client
- TanStack Query for message history
- Optimistic updates with rollback
- Virtual scrolling for performance

**Definition of Done:**
- [ ] Real-time message delivery working
- [ ] Message history loads with pagination
- [ ] Optimistic UI feels instant
- [ ] Connection status visible

---

### Ticket MVP1-008: VPS Deployment Setup
**Type:** DevOps | **Priority:** 🟡 Medium | **Story Points:** 5

**User Story:**
As a developer, I want the app deployed on a VPS so that users can access it from anywhere.

**Acceptance Criteria:**
- [ ] Docker Compose configuration
- [ ] Multi-stage Dockerfile for Node.js
- [ ] Nginx reverse proxy with SSL (Let's Encrypt)
- [ ] PostgreSQL with persistent volume
- [ ] Redis with persistent volume
- [ ] Environment variables configured
- [ ] Health check endpoints working
- [ ] Automated deployment script

**Technical Notes:**
- VPS: 2GB RAM minimum, 4GB recommended
- Use `node:20-alpine` for smaller image
- Nginx handles SSL termination
- Certbot for automatic SSL renewal

**Definition of Done:**
- [ ] App accessible via HTTPS
- [ ] Database persists across restarts
- [ ] SSL certificate auto-renews
- [ ] Zero-downtime deployment possible

**Related Docs:**
- [RFC Scalability](rfc-scalability-deployment.md)

---

## 🎯 MVP 2: Read Receipts

### Ticket MVP2-001: Read Receipts Data Model
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 3

**User Story:**
As a developer, I need to store read receipts so that users can see when messages are read.

**Acceptance Criteria:**
- [ ] `read_receipts` table created
- [ ] `last_read_message_id` column added to `conversation_participants`
- [ ] Indexes for fast lookups
- [ ] Migration created and tested

**Technical Notes:**
- Composite PK: (message_id, user_id)
- Index on message_id for count queries
- Index on user_id for user's read history

---

### Ticket MVP2-002: Read Receipts API
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 5

**User Story:**
As a user, I want to see when my messages are read so that I know they were received.

**Acceptance Criteria:**
- [ ] WebSocket event: `receipt:read` (client → server)
- [ ] WebSocket event: `receipt:updated` (server → client, 1:1)
- [ ] WebSocket event: `receipt:count` (server → client, groups)
- [ ] REST endpoint: `GET /messages/:id/receipts`
- [ ] 1:1 chats: Instant DB write
- [ ] Group chats: Redis counter + batch flush
- [ ] Privacy: Respect `read_receipts_enabled` setting

**Technical Notes:**
- Redis key: `read_count:{conversation_id}:{message_id}`
- Batch flush every 10 seconds to PostgreSQL
- Worker process for batching

**Definition of Done:**
- [ ] Read receipts update in real-time
- [ ] Group counts aggregated correctly
- [ ] Privacy settings respected
- [ ] Batch worker tested

---

### Ticket MVP2-003: Frontend - Read Receipts UI
**Type:** Frontend | **Priority:** 🔴 Critical | **Story Points:** 5

**User Story:**
As a user, I want to see read status on my messages so that I know when they're read.

**Acceptance Criteria:**
- [ ] Double checkmark icon for read messages
- [ ] "Read by N" text for group messages
- [ ] Read receipt details popup (who read, when)
- [ ] Messages auto-mark as read on viewport
- [ ] `last_read_message_id` sync on reconnect

**Technical Notes:**
- Use IntersectionObserver for viewport detection
- Debounce read receipts (1 second)
- Show "Read by 5" with click for details

---

### Ticket MVP2-004: Batch Worker
**Type:** Backend | **Priority:** 🟡 Medium | **Story Points:** 3

**User Story:**
As a system, I need to batch read receipt writes so that database load is reduced.

**Acceptance Criteria:**
- [ ] Background worker runs every 10 seconds
- [ ] Reads from Redis queue
- [ ] Bulk INSERT into PostgreSQL
- [ ] Updates `last_read_message_id`
- [ ] Error handling with retry
- [ ] Max retry: 5 attempts

**Technical Notes:**
- Use NestJS `@Interval` decorator
- Redis list: `read_receipts:pending`
- Transaction per batch

---

## 🎯 MVP 3: Presence

### Ticket MVP3-001: Presence Data Model
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 3

**User Story:**
As a developer, I need to track user presence so that others can see who's online.

**Acceptance Criteria:**
- [ ] Redis presence key structure defined
- [ ] `last_seen_at` column added to users table
- [ ] `presence_enabled` privacy setting
- [ ] Migration created

**Technical Notes:**
- Redis key: `presence:{user_id}` (30s TTL)
- Value: JSON with status, lastActivity, devices

---

### Ticket MVP3-002: Presence System
**Type:** Backend | **Priority:** 🔴 Critical | **Story Points:** 5

**User Story:**
As a user, I want to see who's online so that I know who can respond quickly.

**Acceptance Criteria:**
- [ ] WebSocket event: `presence:heartbeat` (15s interval)
- [ ] WebSocket event: `presence:update` (broadcast)
- [ ] TTL-based offline detection (30s)
- [ ] Multi-device support
- [ ] Privacy settings respected
- [ ] `last_seen_at` updated on disconnect

**Technical Notes:**
- Redis SETEX on heartbeat
- Keyspace notifications for expiry
- Grace period: 5s before marking offline

**Definition of Done:**
- [ ] Online status accurate within 30s
- [ ] Multi-device handled correctly
- [ ] Privacy settings work
- [ ] Last seen timestamp accurate

---

### Ticket MVP3-003: Frontend - Presence UI
**Type:** Frontend | **Priority:** 🔴 Critical | **Story Points:** 3

**User Story:**
As a user, I want to see online status indicators so that I know who's available.

**Acceptance Criteria:**
- [ ] Green dot for online users
- [ ] Yellow dot for away (5min inactive)
- [ ] Gray dot for offline
- [ ] "Last seen X minutes ago" text
- [ ] Presence indicators in conversation list
- [ ] Presence indicators in chat header

**Technical Notes:**
- Subscribe to `presence:update` events
- Update TanStack Query cache
- Format last seen relative time

---

### Ticket MVP3-004: Observability Setup
**Type:** DevOps | **Priority:** 🟡 Medium | **Story Points:** 5

**User Story:**
As a developer, I want monitoring so that I can detect and fix issues quickly.

**Acceptance Criteria:**
- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboards
- [ ] Structured logging with Pino
- [ ] Health check endpoints
- [ ] Alert rules for critical errors
- [ ] Three-second problem monitoring
- [ ] Docker Compose for observability stack

**Technical Notes:**
- Metrics: message latency, error rate, active connections
- Alerts: p95 > 3s, error rate > 0.1%
- Loki for log aggregation

**Definition of Done:**
- [ ] Metrics visible in Grafana
- [ ] Alerts trigger correctly
- [ ] Logs searchable
- [ ] Health checks passing

**Related Docs:**
- [RFC Observability](rfc-observability.md)

---

## 📊 Sprint Planning

### Sprint 0 (Week 1): Setup
- SETUP-001: Monorepo Setup

### Sprint 1 (Weeks 2-3): Foundation
- MVP1-001: Database Schema
- MVP1-002: Authentication System
- MVP1-003: REST API - Conversations

### Sprint 2 (Weeks 3-4): Real-time
- MVP1-004: WebSocket Gateway
- MVP1-005: Write-Through Storage
- MVP1-006: Frontend Auth

### Sprint 3 (Weeks 5-6): UI & Deploy
- MVP1-007: Frontend Chat
- MVP1-008: VPS Deployment

### Sprint 4 (Weeks 7-8): Read Receipts
- MVP2-001: Receipts Data Model
- MVP2-002: Receipts API
- MVP2-003: Receipts UI
- MVP2-004: Batch Worker

### Sprint 5 (Weeks 9-10): Presence & Polish
- MVP3-001: Presence Data Model
- MVP3-002: Presence System
- MVP3-003: Presence UI
- MVP3-004: Observability

---

## 🔗 Related Documents

- [RFC Database Schema](rfc-database-schema.md)
- [RFC WebSocket Protocol](rfc-websocket-protocol.md)
- [RFC REST API](rfc-rest-api.md)
- [RFC Authentication](rfc-authentication.md)
- [RFC Message Storage](rfc-message-storage.md)
- [RFC Observability](rfc-observability.md)
- [RFC Scalability & Deployment](rfc-scalability-deployment.md)

---

**Total Story Points:** 91 points  
**Estimated Duration:** 11 weeks (6 sprints)  
**Team Size:** 2-3 developers
