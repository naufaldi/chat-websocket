# Chat System Documentation Tasks

> **Goal:** Create complete technical documentation for MVP 1-3 before implementation  
> **Approach:** Documentation-first, each task = 1 deliverable document  
> **Reference:** Based on "Three-Second Problem" requirements (WhatsApp/Discord/Telegram patterns)

---

## 📋 Task Overview

| ID | Task | MVP | Priority | Status | Est. Time |
|----|------|-----|----------|--------|-----------|
| DOC-001 | Database Schema Design | 1 | 🔴 Critical | ✅ Complete | 2-3 hrs |
| DOC-002 | WebSocket Protocol Specification | 1 | 🔴 Critical | ✅ Complete | 2-3 hrs |
| DOC-003 | REST API Specification | 1 | 🔴 Critical | ✅ Complete | 2-3 hrs |
| DOC-004 | Message Storage Architecture | 1 | 🔴 Critical | ⏳ Pending | 1-2 hrs |
| DOC-005 | Read Receipts Architecture | 2 | 🔴 Critical | ⏳ Pending | 2-3 hrs |
| DOC-006 | Presence System Architecture | 3 | 🔴 Critical | ⏳ Pending | 2-3 hrs |
| DOC-007 | Scalability & Deployment Guide | All | 🟡 Medium | ⏳ Pending | 2 hrs |
| DOC-008 | Error Handling & Observability | All | 🟡 Medium | ⏳ Pending | 1-2 hrs |

**Total Estimated Time:** 14-19 hours of focused documentation work

---

## 🎯 MVP 1: Basic Chat + Message Storage

### Task DOC-001: Database Schema Design

**Goal:** Define complete database schema with tables, relationships, indexes for MVP 1

**Why This Matters:**
- Discord learned the hard way: bad partitioning = 90-second delays for 1.5M user servers
- WhatsApp uses write-through: message not confirmed until persisted to distributed storage
- Schema decisions cascade into every other system component

**Deliverables:**
1. **ER Diagram** (Mermaid or dbdiagram.io)
   - users, conversations, conversation_participants, messages tables
   - All relationships and cardinalities
   
2. **Table Specifications** (per table):
   ```typescript
   // Example format for each table:
   Table: messages
   - id: UUID (PK) - Why UUID? Distributed-safe for future sharding
   - conversation_id: UUID (FK) - Partition key for message history queries
   - sender_id: UUID (FK)
   - content: TEXT (max 4000 chars - Discord limit)
   - content_type: ENUM('text', 'image', 'file') - MVP 1: only 'text'
   - client_message_id: VARCHAR(64) - Deduplication key from client
   - created_at: TIMESTAMP - Message ordering (not ID!)
   - updated_at: TIMESTAMP
   - deleted_at: TIMESTAMP (nullable) - Soft delete
   
   Indexes:
   - PRIMARY KEY (id)
   - INDEX idx_messages_conversation_created (conversation_id, created_at DESC)
   - INDEX idx_messages_sender (sender_id, created_at DESC)
   ```

3. **Design Decisions Documented**:
   - UUID vs BIGSERIAL (trade-offs: distributed vs performance)
   - Soft delete vs hard delete (GDPR compliance?)
   - `created_at` for ordering vs auto-increment (clock skew handling)
   - Bucketing strategy for large channels (Discord's 10-day buckets)

4. **Migration Strategy**:
   - Initial migration file
   - Rollback plan
   - Zero-downtime migration approach

**Output File:** `docs/rfc-database-schema.md`

**Acceptance Criteria:**
- [ ] All MVP 1 tables defined with complete column specs
- [ ] All indexes justified with query patterns
- [ ] ERD diagram included
- [ ] Design decisions documented with trade-offs
- [ ] Migration files specified

---

### Task DOC-002: WebSocket Protocol Specification

**Goal:** Define complete WebSocket message protocol for real-time communication

**Why This Matters:**
- The "Three-Second Problem" requires sub-second delivery
- WebSocket is the critical path for message delivery
- Protocol design affects client complexity and error handling

**Deliverables:**
1. **Connection Lifecycle Flow**:
   ```
   Client → Server: CONNECT with JWT token
   Server → Client: auth:success or auth:error
   Client → Server: subscribe { conversationId }
   Server → Client: subscribed { conversationId }
   [Normal message flow]
   Client → Server: presence:heartbeat (every 15s)
   Server: Auto-disconnect if no heartbeat for 30s
   ```

2. **Message Types Specification** (all events):
   ```typescript
   // Client → Server events
   interface ClientEvents {
     'auth': { token: string }
     'subscribe': { conversationId: string }
     'unsubscribe': { conversationId: string }
     'message:send': {
       conversationId: string
       content: string
       clientMessageId: string  // UUID generated client-side
       contentType: 'text'
     }
     'typing:start': { conversationId: string }
     'typing:stop': { conversationId: string }
   }
   
   // Server → Client events
   interface ServerEvents {
     'auth:success': { userId: string }
     'auth:error': { error: string; code: string }
     'message:received': { message: Message }
     'message:sent': {  // Confirmation
       clientMessageId: string
       messageId: string
       status: 'delivered'
       timestamp: string
     }
     'message:error': {
       clientMessageId: string
       error: string
       code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'NOT_IN_CONVERSATION'
     }
     'typing:started': { conversationId: string; userId: string }
     'typing:stopped': { conversationId: string; userId: string }
   }
   ```

3. **Message Deduplication Strategy**:
   - Client generates `clientMessageId` (UUID v4)
   - Server tracks seen IDs for 5 minutes
   - Prevents double-send on retry

4. **Error Codes & Handling**:
   | Code | Description | Client Action |
   |------|-------------|---------------|
   | `AUTH_FAILED` | Invalid/expired token | Redirect to login |
   | `RATE_LIMITED` | Too many messages | Backoff 1s, retry |
   | `NOT_IN_CONVERSATION` | User removed from chat | Remove from UI |
   | `VALIDATION_ERROR` | Content too long/empty | Show inline error |

5. **Reconnection Strategy**:
   - Exponential backoff: 1s, 2s, 4s, 8s, max 30s
   - On reconnect: re-subscribe to active conversations
   - Fetch missed messages via REST API

**Output File:** `docs/rfc-websocket-protocol.md`

**Acceptance Criteria:**
- [ ] All event types defined with TypeScript interfaces
- [ ] Connection lifecycle flow documented
- [ ] Deduplication strategy specified
- [ ] Error codes table complete
- [ ] Reconnection strategy defined

---

### Task DOC-003: REST API Specification

**Goal:** Define complete REST API for MVP 1 (authentication, conversations, messages)

**Why This Matters:**
- WebSocket handles real-time, but REST handles history and initial load
- Message history requires pagination (cursor-based for performance)
- Authentication must be secure and stateless

**Deliverables:**
1. **Endpoint Catalog**:
   ```
   POST   /api/auth/register
   POST   /api/auth/login
   POST   /api/auth/logout
   POST   /api/auth/refresh
   
   GET    /api/conversations?page=&limit=
   POST   /api/conversations
   GET    /api/conversations/:id
   DELETE /api/conversations/:id
   
   GET    /api/conversations/:id/messages?cursor=&limit=
   POST   /api/conversations/:id/messages
   DELETE /api/conversations/:id/messages/:id
   
   GET    /api/users/search?q=
   GET    /api/users/me
   ```

2. **Request/Response Schemas** (OpenAPI/Swagger format):
   ```yaml
   # Example: GET /api/conversations/:id/messages
   parameters:
     - name: cursor
       in: query
       type: string
       description: Pagination cursor (opaque)
     - name: limit
       in: query
       type: integer
       default: 50
       maximum: 100
   
   response:
     200:
       schema:
         type: object
         properties:
           messages:
             type: array
             items: $ref: '#/definitions/Message'
           nextCursor:
             type: string
             nullable: true
           hasMore:
             type: boolean
   ```

3. **Pagination Strategy**:
   - **Cursor-based** (not offset) - O(1) performance at scale
   - Cursor = base64 encoded `(created_at, id)` tuple
   - Default page size: 50 messages
   - Max page size: 100 messages

4. **Authentication Specification**:
   - JWT access token: 15-minute expiry
   - JWT refresh token: 7-day expiry, stored in httpOnly cookie
   - Token rotation on refresh (security best practice)
   - Auth header: `Authorization: Bearer <token>`

5. **Rate Limiting**:
   | Endpoint | Limit | Window |
   |----------|-------|--------|
   | POST /auth/login | 5 | 15 min |
   | POST /messages | 30 | 1 min |
   | GET /messages | 60 | 1 min |
   | WebSocket connect | 10 | 1 min |

**Output File:** `docs/rfc-rest-api.md`

**Acceptance Criteria:**
- [ ] All endpoints documented with methods and paths
- [ ] Request/response schemas defined (OpenAPI format)
- [ ] Pagination strategy specified (cursor-based)
- [ ] Authentication flow documented
- [ ] Rate limits table complete

---

### Task DOC-004: Message Storage Architecture

**Goal:** Document write-through message storage architecture with failure handling

**Why This Matters:**
- "Three-Second Problem": User must know message saved within 3 seconds
- Write-through vs write-behind affects durability guarantees
- Failure modes must be handled gracefully

**Deliverables:**
1. **Write-Through Flow**:
   ```
   1. Client sends message via WebSocket
   2. Server validates (auth, rate limit, content)
   3. Server writes to PostgreSQL (within transaction)
   4. On success: broadcast to recipients via WebSocket
   5. Server sends 'message:sent' confirmation to sender
   6. If any step fails: send 'message:error' with retryable flag
   
   Total latency target: < 500ms for p95
   ```

2. **Failure Scenarios & Handling**:
   | Failure Point | Detection | Handling |
   |---------------|-----------|----------|
   | DB connection lost | Connection timeout | Retry 3x with backoff, queue in memory |
   | DB write timeout | > 3 seconds | Return error, client shows "sending..." |
   | WebSocket broadcast fails | ACK timeout | Message saved, retry broadcast |
   | Client disconnect mid-send | Connection close | Message queued, deliver on reconnect |

3. **Optimistic UI Pattern**:
   ```typescript
   // Client-side with TanStack Query
   sendMessage.mutate(newMessage, {
     onMutate: async () => {
       // Immediately add to UI with 'sending' status
       queryClient.setQueryData(['messages', convId], old => ({
         ...old,
         messages: [...old.messages, { ...newMessage, status: 'sending' }]
       }));
     },
     onSuccess: (data) => {
       // Update to 'delivered'
       queryClient.setQueryData(['messages', convId], ...);
     },
     onError: (error) => {
       // Show retry button
       queryClient.setQueryData(['messages', convId], ...);
     }
   });
   ```

4. **Message Ordering Guarantees**:
   - Use `created_at` timestamp (not ID) for ordering
   - Handle clock skew: NTP synchronized servers
   - Out-of-order delivery: Client sorts by timestamp
   - Duplicate detection: `clientMessageId` deduplication

5. **Performance Targets**:
   | Metric | Target | Measurement |
   |--------|--------|-------------|
   | p50 latency | < 100ms | Send to confirmation |
   | p95 latency | < 500ms | Send to confirmation |
   | p99 latency | < 1000ms | Send to confirmation |
   | Error rate | < 0.1% | Failed sends / total sends |

**Output File:** `docs/rfc-message-storage-architecture.md`

**Acceptance Criteria:**
- [ ] Write-through flow documented with timing targets
- [ ] All failure scenarios mapped with handling strategies
- [ ] Optimistic UI pattern specified
- [ ] Ordering guarantees documented
- [ ] Performance targets defined

---

## 🎯 MVP 2: Read Receipts

### Task DOC-005: Read Receipts Architecture

**Goal:** Design read receipt system handling phantom update problem and offline sync

**Why This Matters:**
- "Phantom Update Problem": 1,000 reads = 1,000 DB writes without optimization
- Telegram uses Redis counters + batch flush to solve this
- Signal's `last_read_message_id` solves offline sync

**Deliverables:**
1. **Hybrid Architecture** (1:1 vs Groups):
   ```
   1:1 Direct Messages:
   - Instant update to PostgreSQL
   - Real-time WebSocket notification
   - Show exact read time
   
   Group Messages (10+ participants):
   - Redis counter: INCR read_count:{message_id}
   - Background worker flushes every 10 seconds
   - Show aggregated count: "Read by 47"
   - Click to see individual read times
   ```

2. **Data Model Extensions**:
   ```typescript
   // PostgreSQL (for 1:1 and flushed group receipts)
   Table: read_receipts
   - message_id: UUID (FK, PK)
   - user_id: UUID (FK, PK)
   - read_at: TIMESTAMP
   
   // conversation_participants (add column)
   - last_read_message_id: UUID (FK)
   - last_read_at: TIMESTAMP
   
   // Redis (for group counters - temporary)
   Key: read_count:{conversation_id}:{message_id}
   Value: Integer (counter)
   TTL: 24 hours
   
   // Redis (pending batch queue)
   Key: read_receipts:pending
   Value: List of { messageId, userId, readAt }
   ```

3. **When to Mark as Read**:
   | Trigger | Implementation | Use Case |
   |---------|---------------|----------|
   | Viewport | IntersectionObserver 50% for 1s | Default behavior |
   | Focus | Window focus + conversation active | Quick catch-up |
   | Reply | Implicit read on send | Active conversation |
   | Manual | User clicks "Mark as read" | Override |

4. **Batch Flush Strategy**:
   ```
   Worker runs every 10 seconds:
   1. Read all items from Redis queue (read_receipts:pending)
   2. Group by conversation_id
   3. Bulk INSERT into read_receipts table
   4. Update conversation_participants.last_read_message_id
   5. Clear processed items from queue
   6. Emit WebSocket events for updated receipts
   
   Failure handling:
   - If bulk insert fails: keep in queue, retry next cycle
   - If partial failure: retry only failed items
   - Max retry: 5 attempts, then alert + manual intervention
   ```

5. **Offline Sync Protocol**:
   ```
   On client reconnect:
   1. Client sends: { last_read_message_id: "msg_123", conversation_id: "conv_456" }
   2. Server marks all messages before msg_123 as read
   3. Server returns: { unread_count: 5, last_read_at: "2024-01-15T10:30:00Z" }
   4. Client updates UI (no flickering)
   
   Edge case: Client has newer last_read than server
   - Server accepts client's value (client is source of truth for "what I saw")
   ```

6. **Privacy Settings**:
   ```typescript
   // users table (add column)
   - read_receipts_enabled: boolean (default: true)
   
   // Behavior:
   - If disabled: Sender sees "delivered" but never "read"
   - Reader still tracks internally (for sync), just doesn't broadcast
   - Can be per-conversation override (future)
   ```

**Output File:** `docs/rfc-read-receipts-architecture.md`

**Acceptance Criteria:**
- [ ] Hybrid 1:1 vs group architecture documented
- [ ] Data model extensions specified
- [ ] "Mark as read" triggers defined
- [ ] Batch flush strategy detailed
- [ ] Offline sync protocol specified
- [ ] Privacy settings documented

---

## 🎯 MVP 3: Presence

### Task DOC-006: Presence System Architecture

**Goal:** Design real-time presence system with heartbeat and multi-device support

**Why This Matters:**
- Users need to know "who can respond quickly"
- TTL-based presence is simple but has edge cases
- Multi-device support is critical (mobile + desktop)

**Deliverables:**
1. **Presence State Machine**:
   ```
   States:
   - online: Active WebSocket connection, recent heartbeat
   - away: Connection active, no activity for 5 minutes
   - offline: No connection, TTL expired, or explicit logout
   - invisible: Online but appears offline (privacy feature)
   
   Transitions:
   - connect → online
   - online + 5min inactivity → away
   - away + activity → online
   - disconnect + 30s TTL → offline
   - explicit invisible toggle → invisible
   ```

2. **Heartbeat Mechanism**:
   ```
   Client sends every 15 seconds:
   { type: 'presence:heartbeat', status: 'online' | 'away' }
   
   Server actions:
   1. SET presence:{user_id} "online" EX 30
   2. Update metadata: last_activity, device_info
   
   On missing heartbeat (30s TTL expires):
   1. Redis auto-deletes key
   2. Server detects deletion via keyspace notifications
   3. Broadcast "offline" to subscribers
   4. Update PostgreSQL: users.last_seen_at = NOW()
   ```

3. **Data Model**:
   ```typescript
   // Redis (ephemeral)
   Key: presence:{user_id}
   Value: JSON {
     status: 'online' | 'away',
     lastActivity: timestamp,
     devices: [
       { deviceId: string, type: 'mobile' | 'desktop', connectedAt: timestamp }
     ]
   }
   TTL: 30 seconds
   
   // PostgreSQL (persistent)
   // users table (add columns)
   - last_seen_at: TIMESTAMP (updated on disconnect)
   - presence_enabled: BOOLEAN (default: true)
   
   // presence_subscriptions table (who sees who's presence)
   - subscriber_id: UUID (FK → users)
   - target_id: UUID (FK → users)
   - created_at: TIMESTAMP
   // Implicit: Friends, conversation participants
   ```

4. **Multi-Device Handling**:
   ```
   User has 2 devices connected:
   - Desktop: online, lastActivity: now
   - Mobile: online, lastActivity: 2 min ago
   
   Presence shown to others:
   - Status: online (best of all devices)
   - Detail: "Online on desktop" (most recent device)
   
   One device disconnects:
   - Still online (other device active)
   - Update device list
   
   All devices disconnect:
   - Wait 30s TTL
   - Mark offline
   - Show "Last seen 2 minutes ago"
   ```

5. **Subscription Model**:
   ```
   Who receives presence updates?
   - Friends (friend list)
   - Conversation participants (active conversations)
   - Explicit subscriptions (future: follow feature)
   
   Fan-out strategy:
   - On presence change: publish to Redis channel
   - Subscribed servers receive and forward to connected clients
   - Limit: Max 1,000 subscribers per presence update (pagination)
   ```

6. **Privacy Controls**:
   ```typescript
   // users table
   - presence_enabled: boolean (default: true)
   - presence_sharing: 'everyone' | 'friends' | 'nobody'
   
   // Behaviors:
   - 'nobody': Always appear offline, no presence updates sent
   - 'friends': Only friends see presence
   - 'everyone': All conversation participants see presence
   ```

**Output File:** `docs/rfc-presence-architecture.md`

**Acceptance Criteria:**
- [ ] Presence state machine documented
- [ ] Heartbeat mechanism specified (interval, TTL)
- [ ] Data model defined (Redis + PostgreSQL)
- [ ] Multi-device handling strategy
- [ ] Subscription/fan-out model
- [ ] Privacy controls documented

---

## 🔧 Cross-Cutting Concerns

### Task DOC-007: Scalability & Deployment Guide

**Goal:** Document horizontal scaling strategy and VPS deployment

**Deliverables:**
1. **Horizontal Scaling Architecture**:
   ```
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   Client    │────▶│  Load Balancer│────▶│  WS Server 1│
   └─────────────┘     │   (sticky)    │     ├─────────────┤
                       └─────────────┘     │  WS Server 2│
                              │            ├─────────────┤
                              │            │  WS Server N│
                              ▼            └──────┬──────┘
                       ┌─────────────┐            │
                       │   Redis     │◀───────────┘
                       │  Pub/Sub    │    (broadcast)
                       └──────┬──────┘
                              │
                              ▼
                       ┌─────────────┐
                       │ PostgreSQL  │
                       │  (primary)  │
                       └──────┬──────┘
                              │
                       ┌──────┴──────┐
                       │ Read Replica│ (optional)
                       └─────────────┘
   ```

2. **Redis Pub/Sub for Cross-Server Broadcast**:
   ```
   Channel naming:
   - chat:conversation:{conversation_id}  (messages)
   - chat:presence:{user_id}              (presence updates)
   - chat:system                          (global announcements)
   
   Message format:
   {
     type: 'message:received',
     serverId: 'ws-server-1',
     payload: { ... }
   }
   
   Flow:
   1. Client sends message to WS Server 1
   2. Server 1 saves to DB
   3. Server 1 publishes to Redis channel
   4. All subscribed servers (1, 2, N) receive
   5. Each server forwards to connected clients in that conversation
   ```

3. **Sticky Sessions Configuration**:
   ```nginx
   # Nginx example
   upstream websocket_servers {
       ip_hash;  # Sticky by IP
       server ws1:3000;
       server ws2:3000;
       server ws3:3000;
   }
   
   server {
       location /ws {
           proxy_pass http://websocket_servers;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

4. **Docker Compose for VPS**:
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://...
         - REDIS_URL=redis://redis:6379
       depends_on:
         - postgres
         - redis
       deploy:
         replicas: 2  # Scale horizontally
     
     postgres:
       image: postgres:15-alpine
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
     
     redis:
       image: redis:7-alpine
       volumes:
         - redis_data:/data
     
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
   ```

5. **Database Connection Pooling**:
   ```typescript
   // Recommended pool sizes
   const poolConfig = {
     min: 5,           // Always keep 5 connections ready
     max: 20,          // Max 20 concurrent connections
     acquire: 30000,   // 30s timeout to acquire connection
     idle: 10000,      // 10s before closing idle connection
     evict: 1000       // Check for idle connections every 1s
   };
   
   // Formula: max = (CPU cores * 2) + effective_spindle_count
   // For VPS with 2 cores: max = (2 * 2) + 1 = 5 (conservative)
   // For dedicated DB: can go higher
   ```

**Output File:** `docs/rfc-scalability-deployment.md`

**Acceptance Criteria:**
- [ ] Horizontal scaling architecture diagram
- [ ] Redis Pub/Sub channel strategy
- [ ] Sticky sessions configuration
- [ ] Docker Compose for VPS
- [ ] Connection pooling recommendations

---

### Task DOC-008: Error Handling & Observability

**Goal:** Document error handling strategies and observability setup

**Deliverables:**
1. **Error Categories & Handling**:
   ```typescript
   // Retryable errors (exponential backoff)
   'NETWORK_ERROR': 'Connection lost, retry with backoff'
   'DB_TIMEOUT': 'Database slow, retry 3x then fail'
   'RATE_LIMITED': 'Wait Retry-After header, then retry'
   
   // Non-retryable errors (fail fast)
   'VALIDATION_ERROR': 'Bad input, show inline error'
   'UNAUTHORIZED': 'Token expired, redirect to login'
   'NOT_FOUND': 'Resource deleted, remove from UI'
   
   // Critical errors (alert + degrade gracefully)
   'DB_CONNECTION_LOST': 'Alert dev team, queue messages in memory'
   'REDIS_UNAVAILABLE': 'Alert, fallback to DB-only mode'
   ```

2. **Three-Second Problem Monitoring**:
   ```typescript
   // Metrics to track (Prometheus format)
   chat_message_send_latency_seconds_bucket{le="0.1"}
   chat_message_send_latency_seconds_bucket{le="0.5"}
   chat_message_send_latency_seconds_bucket{le="1.0"}
   chat_message_send_latency_seconds_bucket{le="3.0"}
   chat_message_send_latency_seconds_bucket{le="+Inf"}
   
   // Alert rules
   ALERT MessageDeliverySlow
     IF histogram_quantile(0.95, chat_message_send_latency_seconds) > 3
     FOR 5m
     LABELS { severity = "critical" }
     ANNOTATIONS {
       summary = "Message delivery p95 > 3 seconds",
       description = "{{ $value }}s latency, users experiencing delays"
     }
   ```

3. **Structured Logging**:
   ```typescript
   // Log format (JSON)
   {
     "timestamp": "2024-01-15T10:30:00.000Z",
     "level": "info",
     "service": "chat-api",
     "traceId": "abc-123-def",
     "event": "message.sent",
     "data": {
       "userId": "user_123",
       "conversationId": "conv_456",
       "messageId": "msg_789",
       "latencyMs": 45,
       "clientMessageId": "client_abc"
     }
   }
   
   // Key events to log
   - websocket.connected
   - websocket.disconnected
   - message.sent
   - message.delivered
   - message.failed
   - presence.changed
   - receipt.updated
   ```

4. **Health Checks**:
   ```typescript
   // Health check endpoints
   GET /health/live    // Liveness (is process running?)
   GET /health/ready   // Readiness (can serve traffic?)
   
   // Readiness checks:
   - Database connection: SELECT 1
   - Redis connection: PING
   - WebSocket server: accepting connections
   
   // Kubernetes probes
   livenessProbe:
     httpGet:
       path: /health/live
       port: 3000
     initialDelaySeconds: 10
     periodSeconds: 10
   
   readinessProbe:
     httpGet:
       path: /health/ready
       port: 3000
     initialDelaySeconds: 5
     periodSeconds: 5
   ```

**Output File:** `docs/rfc-error-handling-observability.md`

**Acceptance Criteria:**
- [ ] Error categories with handling strategies
- [ ] Three-second problem metrics and alerts
- [ ] Structured logging specification
- [ ] Health check endpoints defined

---

## 📊 Task Dependencies

```
DOC-001 (Database Schema)
    │
    ├── DOC-002 (WebSocket Protocol) ──┐
    │                                    │
    ├── DOC-003 (REST API) ────────────┤
    │                                    │
    └── DOC-004 (Message Storage) ◄────┘
              │
              ▼
        DOC-005 (Read Receipts)
              │
              ▼
        DOC-006 (Presence)
              │
              ├── DOC-007 (Scalability)
              │
              └── DOC-008 (Observability)
```

**Parallel Work:**
- DOC-001, DOC-002, DOC-003 can be done in parallel
- DOC-004 depends on DOC-001, DOC-002
- DOC-005 depends on DOC-004
- DOC-006 depends on DOC-004
- DOC-007, DOC-008 can be done anytime after DOC-001

---

## ✅ Definition of Done (Per Task)

Each documentation task is complete when:

1. **Document created** in `docs/` directory
2. **All sections** from deliverables checklist are written
3. **Code examples** provided where applicable
4. **Design decisions** documented with rationale
5. **Trade-offs** explicitly stated
6. **Reviewed** by at least one other person (or self-reviewed after 24h)
7. **Linked** from main RFC.md (Table of Contents update)

---

## 🚀 Getting Started

**Recommended Order:**

**Week 1:**
- Day 1-2: DOC-001 (Database Schema)
- Day 3-4: DOC-002 (WebSocket Protocol)
- Day 5: DOC-003 (REST API)

**Week 2:**
- Day 1-2: DOC-004 (Message Storage)
- Day 3-4: DOC-005 (Read Receipts)
- Day 5: DOC-006 (Presence)

**Week 3:**
- Day 1-2: DOC-007 (Scalability)
- Day 3-4: DOC-008 (Observability)
- Day 5: Review all docs, update RFC.md TOC

**Total:** 3 weeks of focused documentation work before writing any implementation code.

---

## 📝 Notes

- Each task is designed to be completed in 1 focused session (2-3 hours)
- Tasks build on each other - follow the dependency graph
- Real-world examples from WhatsApp, Discord, Telegram included
- All deliverables are documentation files - no code yet
- Goal: Learn the domain deeply before building

---

## 🔮 Future Work (Gaps to Address Later)

The following gaps have been identified but are deferred to post-MVP phases:

### Gap #3: Missing Critical Backend Components

**Status:** Documented in requirements, needs RFC  
**Priority:** Phase 2-3  
**Impact:** Required for production readiness

**Missing Components:**
1. **Message Queue for Offline Users**
   - Problem: If recipient is offline when message sent, they miss it until reconnect
   - Solution: Redis Streams or RabbitMQ for guaranteed delivery
   - Trade-off: Adds complexity vs simpler "fetch on reconnect" approach

2. **Circuit Breaker Pattern**
   - Problem: Cascading failures when DB/Redis is slow
   - Solution: Implement circuit breaker for external service calls
   - Library: `opossum` or custom implementation

3. **File Upload Handling**
   - Problem: No support for images/files in messages
   - Solution: S3-compatible storage (MinIO for VPS) + presigned URLs
   - Security: Virus scanning, file type validation, size limits

4. **Advanced Rate Limiting**
   - Current: Basic per-endpoint limits documented
   - Missing: User-specific limits, burst handling, distributed rate limiting

5. **Message Search**
   - Problem: No full-text search for message history
   - Solution: Elasticsearch or PostgreSQL full-text search
   - Complexity: High (indexing, ranking, highlighting)

### Gap #4: Architecture Decision Records (ADRs)

**Status:** Not documented  
**Priority:** Low (maintenance)  
**Impact:** Team onboarding, future refactoring

**Needed ADRs:**
1. **ADR-001: Why NestJS over Elysia/Express?**
   - Decision: NestJS for structure and WebSocket gateway
   - Context: Team familiarity, ecosystem maturity
   - Consequences: More boilerplate, steeper learning curve

2. **ADR-002: Why Drizzle over Prisma?**
   - Decision: Drizzle for performance and SQL control
   - Context: "Three-Second Problem" latency requirements
   - Consequences: More manual work, smaller ecosystem

3. **ADR-003: Why Write-Through over Write-Behind?**
   - Decision: Synchronous DB write before confirmation
   - Context: Durability guarantee for user trust
   - Consequences: Higher latency, simpler mental model

4. **ADR-004: Why Redis + PostgreSQL over MongoDB?**
   - Decision: Dual database (PostgreSQL for persistence, Redis for ephemeral)
   - Context: ACID requirements for messages, TTL for presence
   - Consequences: More infrastructure, data consistency challenges

5. **ADR-005: Why Socket.io over Raw WebSocket?**
   - Decision: Socket.io for fallback and room management
   - Context: Browser compatibility, automatic reconnection
   - Consequences: Larger bundle, potential performance overhead

### Gap #5: Additional RFCs Needed

**DOC-009: Multi-Region Deployment Strategy**
- Cross-region data replication
- Latency optimization for global users
- Conflict resolution strategies

**DOC-010: Security Hardening Guide**
- SQL injection prevention (parameterized queries)
- XSS protection in message content
- CSRF protection for REST endpoints
- Rate limiting bypass prevention
- Audit logging for compliance

**DOC-011: Performance Optimization Guide**
- Database query optimization
- Connection pooling tuning
- Redis caching strategies
- WebSocket connection limits
- Memory leak detection

**DOC-012: Disaster Recovery Plan**
- Database backup strategies (pg_dump, WAL archiving)
- Redis persistence configuration
- Recovery time objectives (RTO)
- Recovery point objectives (RPO)
- Runbooks for common failures

---

**Last Updated:** 2024-01-15  
**Next Review:** Post-MVP Phase 3 completion
