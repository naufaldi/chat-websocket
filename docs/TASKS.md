# Chat System Development Tasks

> **Project:** Real-time Chat System (Three-Second Problem)  
> **Tech Stack:** NestJS 11.x + Drizzle 0.45.x + PostgreSQL + Redis + Socket.io 4.x + Bun Workspaces  
> **Frontend:** React 19.x + Vite 7.x + TanStack Query 5.x + Tailwind 4.x  
> **Documentation:** Swagger/OpenAPI 3.0  
> **Last Updated:** 2026-02-23 (Status updated after council scan)

---

## 📊 Progress Overview

| Phase | Task | Status | Est. Days | Swagger | Actual Completion |
|-------|------|--------|-----------|---------|-------------------|
| 0 | Foundation | ✅ Complete | 3 | - |
| 1 | Authentication System | ✅ Complete | 4 | ✅ |
| 2 | Conversations API | ✅ Complete | 3 | ✅ |
| 3 | WebSocket Gateway | ✅ Complete | 4 | - |
| 4 | Message System | 🔄 In Progress | 5 | ✅ | ~70% |
| 5 | Read Receipts | 🔄 In Progress | 4 | ✅ | ~60% |
| 6 | Presence System | 🔄 In Progress | 3 | ✅ | ~60% |
| 7 | Deployment & Observability | 🔄 In Progress | 3 | ✅ | ~50% |
| 8 | User Search API | 🔄 In Progress | 2 | - | ~85% |
| 9 | Server-Side Rate Limiting | 🔄 In Progress | 2 | - | ~60% |
| 10 | Message Deduplication | 🔄 In Progress | 2 | - | ~90% |
| 11 | Home Dashboard Page | 🔄 In Progress | 3 | - | ~50% |
| 12 | Settings & Profile Page | 🔄 In Progress | 3 | - | ~40% |

**Total:** 29 days (~6 weeks) | **Completed:** 4/13 tasks | **In Progress:** 9/13 tasks | **Actual Overall:** ~65%

> *Note: See [Reality Check](#-reality-check-codebase-audit) section below for detailed gap analysis. Tasks 5, 6, 7 previously marked complete but have critical missing pieces.*

---

## 🎯 Task Structure

Each task includes:
- **Backend:** API endpoints, WebSocket events, database operations
- **Frontend:** Pages, components, state management
- **Swagger:** OpenAPI documentation for all REST endpoints
- **Testing:** Verification steps and acceptance criteria

---

## ✅ TASK-000: Foundation (Setup)

**Status:** ✅ **COMPLETE**  
**Priority:** 🔴 Critical | **Est:** 3 days

### Backend Scope
- [x] Bun workspaces monorepo structure
- [x] NestJS 11.x application in `apps/server`
- [x] Drizzle ORM schema in `packages/db`
- [x] Database migrations (users, conversations, messages, read_receipts)
- [x] Shared types package (`packages/shared`)

### Frontend Scope
- [x] React 19.x + Vite 7.x in `apps/web`
- [x] Tailwind CSS 4.x configuration
- [x] TanStack Query setup
- [x] Project structure (pages, components, hooks, lib)

### Swagger Scope
- [x] Swagger UI setup at `/api/docs`
- [x] Basic API info and server configuration

### Definition of Done
- [x] `bun install` works across all packages
- [x] `bun run dev` starts both frontend and backend
- [x] Database migrations run successfully
- [x] Swagger UI accessible at `http://localhost:3000/api/docs`

---

## ✅ TASK-001: Authentication System

**Status:** ✅ **COMPLETE**
**Priority:** 🔴 Critical | **Est:** 4 days | **Dependencies:** TASK-000

### Overview
Complete authentication flow with JWT tokens, secure password handling, and protected routes.

### Backend Scope
```typescript
// REST Endpoints
POST   /api/auth/register          // User registration
POST   /api/auth/login             // User login
POST   /api/auth/logout            // Logout (blacklist token)
POST   /api/auth/refresh           // Refresh access token
GET    /api/auth/me                // Get current user

// Implementation Details
- Password hashing with Argon2id
- JWT access token (15-min expiry)
- JWT refresh token (7-day expiry, returned in response body)
- Token refresh returns new tokens; prior refresh tokens remain valid until expiry/logout
- Rate limiting: 5 attempts per 15 min
- Validation: class-validator DTOs (backend), Zod schemas (frontend)
```

### Frontend Scope
```typescript
// Pages
/login          - Login form with email/password
/register       - Registration form with validation

// Components
<LoginForm />       - Email/password inputs, validation
<RegisterForm />    - Registration with confirm password
<ProtectedRoute />  - Route wrapper for auth check

// Hooks
useAuth()           - Auth state, login, logout, register
useTokenRefresh()   - Automatic token refresh

// Features
- Form validation with React Hook Form + Zod
- Automatic redirect after login
- Token stored in localStorage (access + refresh)
- Axios interceptors for 401 handling
```

### Swagger Documentation
```yaml
# Document these endpoints with full schemas
paths:
  /api/auth/register:
    post:
      tags: [Authentication]
      summary: Register new user
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [email, password, displayName]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
                displayName: { type: string, minLength: 2 }
      responses:
        201: { description: User created }
        400: { description: Validation error }
        409: { description: Email already exists }

  /api/auth/login:
    post:
      tags: [Authentication]
      summary: User login
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string }
                password: { type: string }
      responses:
        200: 
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
                  user: { $ref: '#/components/schemas/User' }
        401: { description: Invalid credentials }

# Also document: /logout, /refresh, /me
```

### Testing Strategy
**Backend Tests:**
```bash
# Test via Swagger UI
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

# Verify
- [ ] Registration creates user in DB
- [ ] Password is hashed (not plain text)
- [ ] Login returns valid JWT
- [ ] Refresh token rotation works
- [ ] Logout blacklists token
- [ ] Rate limiting blocks after 5 attempts
```

**Frontend Tests:**
```bash
# Manual testing checklist
- [ ] Login page loads and validates inputs
- [ ] Registration creates account
- [ ] Invalid credentials show error
- [ ] Token refresh happens automatically
- [ ] Protected routes redirect to login
- [ ] Logout clears tokens and redirects
```

**Integration Tests:**
```bash
# End-to-end flow
1. Register new account via FE
2. Login with credentials
3. Access protected route
4. Refresh page - still authenticated
5. Logout - redirected to login
```

### Definition of Done
- [x] All auth endpoints working via Swagger
- [x] FE login/register pages functional
- [x] Token refresh seamless to user
- [x] Rate limiting tested
- [x] Passwords never in plain text
- [x] Swagger docs complete for all auth endpoints

---

## ✅ TASK-002: Conversations API

**Status:** ✅ **COMPLETE**
**Priority:** 🔴 Critical | **Est:** 3 days | **Dependencies:** TASK-001

### Overview
REST API for conversation management with cursor-based pagination.

### Backend Scope
```typescript
// REST Endpoints
GET    /api/conversations              // List with cursor pagination
POST   /api/conversations              // Create conversation
GET    /api/conversations/:id          // Get conversation details
DELETE /api/conversations/:id          // Soft delete (owner only)
POST   /api/conversations/:id/join     // Join conversation
DELETE /api/conversations/:id/leave    // Leave conversation

// Query Parameters for GET /conversations
?cursor={opaque_string}   // Pagination cursor
?limit={number}           // Page size (default: 20, max: 100)

// Implementation Details
- Cursor-based pagination (not offset)
- Cursor = base64 encoded `(updated_at, id)` tuple
- Authorization: Only participants can access
- Response envelope: `{ data: { conversations, meta: { cursor, hasMore } } }`
- Include participant count and last message preview
- Soft delete with `deleted_at` column
```

### Frontend Scope
```typescript
// Components
<ConversationList />        - Sidebar with conversation list
<ConversationItem />        - Single conversation preview
<CreateConversationModal /> - Dialog to create new chat
<ConversationHeader />      - Chat header with title/actions

// Hooks
useConversations()          - Fetch and cache conversation list
useCreateConversation()     - Mutation for creating conversations
useConversationDetails()    - Get single conversation

// Features
- Infinite scroll for conversation list
- Real-time updates via WebSocket
- Create 1:1 or group conversations
- Leave/delete conversation
```

### Swagger Documentation
```yaml
paths:
  /api/conversations:
    get:
      tags: [Conversations]
      summary: List conversations
      security: [bearerAuth: []]
      parameters:
        - name: cursor
          in: query
          schema: { type: string }
          description: Pagination cursor (opaque)
        - name: limit
          in: query
          schema: { type: integer, default: 50, maximum: 100 }
      responses:
        200:
          description: List of conversations
          content:
            application/json:
              schema:
                type: object
                properties:
                  conversations:
                    type: array
                    items: { $ref: '#/components/schemas/Conversation' }
                  nextCursor: { type: string, nullable: true }
                  hasMore: { type: boolean }

    post:
      tags: [Conversations]
      summary: Create conversation
      security: [bearerAuth: []]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [type, participantIds]
              properties:
                type: { type: string, enum: [direct, group] }
                title: { type: string }  // Required for group
                participantIds: 
                  type: array
                  items: { type: string, format: uuid }
      responses:
        201: { description: Conversation created }
        400: { description: Invalid input }

  /api/conversations/{id}:
    get:
      tags: [Conversations]
      summary: Get conversation details
      security: [bearerAuth: []]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Conversation details
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ConversationDetail' }
        403: { description: Not a participant }
        404: { description: Not found }

components:
  schemas:
    Conversation:
      type: object
      properties:
        id: { type: string, format: uuid }
        type: { type: string, enum: [direct, group] }
        title: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
        participantCount: { type: integer }
        lastMessage: { $ref: '#/components/schemas/MessagePreview' }
        unreadCount: { type: integer }
```

### Testing Strategy
**Backend Tests:**
```bash
# Create conversation
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"type":"direct","participantIds":["user-uuid"]}'

# List with pagination
curl "http://localhost:3000/api/conversations?limit=10" \
  -H "Authorization: Bearer {token}"

# Verify
- [ ] Cursor pagination works correctly
- [ ] Only participants can access conversations
- [ ] Soft delete doesn't hard delete
- [ ] Last message preview included
```

**Frontend Tests:**
```bash
# Manual testing
- [ ] Conversation list loads with pagination
- [ ] Create conversation modal works
- [ ] Join/leave conversation updates list
- [ ] Unread counts display correctly
- [ ] Clicking conversation opens chat
```

### Definition of Done
- [x] All conversation endpoints in Swagger
- [x] Cursor pagination tested (manual verification pending)
- [x] FE conversation list functional (manual end-to-end verification pending)
- [x] Create conversation flow functional end-to-end (manual verification pending)
- [x] Authorization enforced
- [x] Soft-deleted conversations excluded from list/detail queries
- [x] Unread count placeholder (TODO: depends on TASK-005 Read Receipts)

### Tests Added
- [x] `conversations.service.test.ts` - Service unit tests with schema validation
- [x] `conversations.repository.test.ts` - Repository unit tests
- [x] `useConversations.test.tsx` - Frontend hook tests
- [x] `api-integration.test.ts` - Backend API integration tests
- [x] `api-integration.test.tsx` - Frontend API integration tests
- [x] Schema validation tests confirm single source of truth

---

## ✅ TASK-003: WebSocket Gateway

**Status:** ✅ **COMPLETE**  
**Priority:** 🔴 Critical | **Est:** 4 days | **Dependencies:** TASK-002

### Overview
Real-time WebSocket server with authentication, room management, and event handling.

### Backend Scope
```typescript
// WebSocket Server Setup
Namespace: /chat
Authentication: JWT via query param ?token={jwt}

// Client → Server Events
'auth': { token: string }
'subscribe': { conversationId: string }
'unsubscribe': { conversationId: string }
'message:send': {
  conversationId: string
  content: string
  clientMessageId: string  // UUID for deduplication
  contentType: 'text'
}
'typing:start': { conversationId: string }
'typing:stop': { conversationId: string }
'presence:heartbeat': { status: 'online' | 'away' }

// Server → Client Events
'auth:success': { userId: string }
'auth:error': { error: string; code: string }
'message:received': { message: Message }
'message:sent': {
  clientMessageId: string
  messageId: string
  status: 'delivered'
  timestamp: string
}
'message:error': {
  clientMessageId: string
  error: string
  code: string
}
'typing:started': { conversationId: string; userId: string }
'typing:stopped': { conversationId: string; userId: string }
'presence:update': { userId: string; status: string }

// Implementation Details
- Socket.io with @nestjs/websockets
- Room per conversation: `conversation:{id}`
- Heartbeat: 15s interval, 30s TTL
- Rate limit: 30 messages/min per user
- Zod validation for all events
- Redis Pub/Sub for cross-server broadcast
```

### Frontend Scope
```typescript
// Hooks
useSocket()              - Socket.io connection management
useChatSocket()          - Chat-specific socket events
useTypingIndicator()     - Typing state management

// Socket Service
class ChatSocketService {
  connect(token: string): void
  disconnect(): void
  subscribeToConversation(conversationId: string): void
  unsubscribeFromConversation(conversationId: string): void
  sendMessage(data: SendMessageData): void
  startTyping(conversationId: string): void
  stopTyping(conversationId: string): void
  onMessageReceived(callback: (message: Message) => void): void
  onMessageSent(callback: (data: MessageSentData) => void): void
  onTypingStarted(callback: (data: TypingData) => void): void
  onTypingStopped(callback: (data: TypingData) => void): void
}

// Features
- Automatic reconnection with exponential backoff
- Message deduplication via clientMessageId
- Connection status indicator
- Heartbeat management
```

### Protocol Documentation
See `docs/rfc-websocket-protocol.md`:
```markdown
# WebSocket Protocol Specification

## Connection
1. Client connects to `/chat?token={jwt}`
2. Server validates JWT
3. Server emits `auth:success` or `auth:error`

## Message Flow
```
Client                          Server
  |                               |
  |--- message:send ------------>|
  |                               |-- Save to DB
  |                               |-- Broadcast to room
  |<-- message:sent --------------|
  |<-- message:received (others) -|
```

## Event Schemas
[Full TypeScript interfaces for all events]

## Error Codes
- AUTH_FAILED: Invalid/expired token
- RATE_LIMITED: Too many messages
- NOT_IN_CONVERSATION: User removed
- VALIDATION_ERROR: Invalid content
```

### Testing Strategy
**Backend Tests:**
```bash
# Connect with valid token
wscat -c "ws://localhost:3000/chat?token={valid_jwt}"

# Subscribe to conversation
> {"event":"subscribe","data":{"conversationId":"uuid"}}

# Send message
> {"event":"message:send","data":{"conversationId":"uuid","content":"Hello","clientMessageId":"client-uuid"}}

# Verify
- [ ] Connection with valid JWT succeeds
- [ ] Invalid JWT returns auth:error
- [ ] Messages broadcast to room participants
- [ ] Typing indicators work
- [ ] Heartbeat keeps connection alive
- [ ] Auto-disconnect after 30s no heartbeat
```

**Frontend Tests:**
```bash
# Manual testing
- [ ] Socket connects on app start
- [ ] Reconnects automatically on disconnect
- [ ] Messages send and receive in real-time
- [ ] Typing indicators show/hide correctly
- [ ] Connection status visible in UI
- [ ] Works after token refresh
```

### Definition of Done
- [x] WebSocket server running on `/chat`
- [x] JWT authentication working
- [x] All events handled correctly
- [x] Protocol documentation synchronized with implementation (RFC comprehensive)
- [x] FE socket service implemented
- [x] Reconnection handling tested (unit tests exist)
- [x] Client emits `presence:heartbeat` every 15s
- [x] Redis Pub/Sub for cross-server broadcast
- [x] Message deduplication working

---

## ✅ TASK-004: Message System

**Status:** ⏳ **PENDING**  
**Priority:** 🔴 Critical | **Est:** 5 days | **Dependencies:** TASK-003

### Overview
Complete message flow with write-through storage, optimistic UI, and message history.

### Backend Scope
```typescript
// REST Endpoints
GET    /api/conversations/:id/messages    // Message history with pagination
POST   /api/conversations/:id/messages    // Send message via HTTP (fallback)
DELETE /api/conversations/:id/messages/:messageId  // Soft delete

// WebSocket Events (from TASK-003)
// message:send, message:sent, message:received, message:error

// Implementation Details
- Write-through: Save to DB before confirming
- Database transaction: INSERT + UPDATE last_message
- Deduplication: Redis key `dedup:{clientMessageId}` (5-min TTL)
- Cursor-based pagination for history
- Soft delete with `deleted_at` column
- Rate limit: 30 messages/min

// Performance Targets
- p50 latency: < 100ms
- p95 latency: < 500ms
- p99 latency: < 1000ms
```

### Frontend Scope
```typescript
// Components
<ChatWindow />           - Main chat area with messages
<MessageList />          - Scrollable message list
<MessageBubble />        - Individual message display
<MessageInput />         - Text input with send button
<TypingIndicator />      - "User is typing..." text

// Hooks
useMessages(conversationId)     - Fetch message history
useSendMessage()                - Send message mutation
useOptimisticMessages()         - Optimistic UI updates

// Features
- Optimistic UI: Message appears instantly with "sending" status
- Infinite scroll for message history
- Auto-scroll to bottom on new messages
- Message status: sending → delivered
- Retry on failure
- Edit/delete own messages
```

### Swagger Documentation
```yaml
paths:
  /api/conversations/{conversationId}/messages:
    get:
      tags: [Messages]
      summary: Get message history
      security: [bearerAuth: []]
      parameters:
        - name: conversationId
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 50, maximum: 100 }
      responses:
        200:
          description: Message history
          content:
            application/json:
              schema:
                type: object
                properties:
                  messages:
                    type: array
                    items: { $ref: '#/components/schemas/Message' }
                  nextCursor: { type: string, nullable: true }
                  hasMore: { type: boolean }

    post:
      tags: [Messages]
      summary: Send message (HTTP fallback)
      security: [bearerAuth: []]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [content, clientMessageId]
              properties:
                content: { type: string, maxLength: 4000 }
                clientMessageId: { type: string }
                contentType: { type: string, enum: [text], default: text }
      responses:
        201: { description: Message created }
        400: { description: Validation error }
        429: { description: Rate limited }

components:
  schemas:
    Message:
      type: object
      properties:
        id: { type: string, format: uuid }
        conversationId: { type: string, format: uuid }
        senderId: { type: string, format: uuid }
        sender: { $ref: '#/components/schemas/User' }
        content: { type: string }
        contentType: { type: string, enum: [text] }
        clientMessageId: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
        deletedAt: { type: string, format: date-time, nullable: true }
```

### Testing Strategy
**Backend Tests:**
```bash
# Send message via REST (fallback)
curl -X POST http://localhost:3000/api/conversations/{id}/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello","clientMessageId":"client-uuid"}'

# Get message history
curl "http://localhost:3000/api/conversations/{id}/messages?limit=20" \
  -H "Authorization: Bearer {token}"

# Verify
- [ ] Message saved to DB before confirmation
- [ ] Deduplication prevents duplicates
- [ ] Cursor pagination works
- [ ] Rate limiting enforced
- [ ] Latency < 500ms for p95
```

**Frontend Tests:**
```bash
# Manual testing
- [ ] Messages appear instantly (optimistic UI)
- [ ] Status changes from "sending" to "delivered"
- [ ] Infinite scroll loads history
- [ ] Retry button on failure
- [ ] Auto-scroll to bottom
- [ ] Typing indicators work
```

**Integration Tests:**
```bash
# End-to-end flow
1. Open conversation
2. Type message and send
3. Message appears immediately with "sending"
4. Status changes to "delivered"
5. Other participant sees message in real-time
6. Refresh page - message persists
```

### Definition of Done
- [ ] Write-through storage working
- [ ] Optimistic UI feels instant
- [ ] Message history pagination working
- [ ] Swagger docs complete
- [ ] Deduplication tested
- [ ] Performance targets met

---

## ✅ TASK-005: Read Receipts

**Status:** ✅ **COMPLETE**
**Priority:** 🔴 Critical | **Est:** 4 days | **Dependencies:** TASK-004

### Overview
Read receipt system with hybrid architecture (instant for 1:1, batched for groups).

### Backend Scope
```typescript
// Database Schema
Table: read_receipts
- message_id: UUID (FK, PK)
- user_id: UUID (FK, PK)
- read_at: TIMESTAMP

// Add to conversation_participants
- last_read_message_id: UUID (FK)
- last_read_at: TIMESTAMP

// WebSocket Events
Client → Server:
'receipt:read': { conversationId: string, messageId: string }

Server → Client:
'receipt:updated': { messageId: string, userId: string, readAt: string }  // 1:1
'receipt:count': { messageId: string, count: number }  // Groups

// REST Endpoints
GET /api/messages/:id/receipts    // Get read receipts for message

// Implementation Details
- 1:1 chats: Instant DB write + real-time notification
- Group chats (10+): Redis counter + batch flush every 10s
- Redis key: `read_count:{conversation_id}:{message_id}`
- Batch worker: NestJS @Interval(10000)
- Privacy: Respect `read_receipts_enabled` setting

// Batch Worker
1. Read from Redis queue `read_receipts:pending`
2. Group by conversation_id
3. Bulk INSERT into read_receipts table
4. Update conversation_participants.last_read_message_id
5. Emit WebSocket events
```

### Frontend Scope
```typescript
// Components
<ReadReceipt />          - Double checkmark icon
<ReadReceiptDetails />   - Popup with who read and when
<ReadReceiptCount />     - "Read by N" for groups

// Hooks
useReadReceipts(messageId)      - Get read receipts
useMarkAsRead(conversationId)   - Mark messages as read

// Features
- Double checkmark for read messages
- "Read by N" text for group messages
- Click to see read details
- Auto-mark as read on viewport (IntersectionObserver)
- Debounce: 1 second
- Sync last_read_message_id on reconnect
```

### Swagger Documentation
```yaml
paths:
  /api/messages/{messageId}/receipts:
    get:
      tags: [Read Receipts]
      summary: Get read receipts for a message
      security: [bearerAuth: []]
      parameters:
        - name: messageId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: List of read receipts
          content:
            application/json:
              schema:
                type: object
                properties:
                  receipts:
                    type: array
                    items:
                      type: object
                      properties:
                        userId: { type: string, format: uuid }
                        user: { $ref: '#/components/schemas/User' }
                        readAt: { type: string, format: date-time }
                  totalCount: { type: integer }
                  readCount: { type: integer }

components:
  schemas:
    ReadReceipt:
      type: object
      properties:
        messageId: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        readAt: { type: string, format: date-time }
```

### Testing Strategy
**Backend Tests:**
```bash
# Mark message as read via WebSocket
> {"event":"receipt:read","data":{"conversationId":"uuid","messageId":"uuid"}}

# Get receipts via REST
curl http://localhost:3000/api/messages/{id}/receipts \
  -H "Authorization: Bearer {token}"

# Verify
- [ ] 1:1 receipts instant
- [ ] Group receipts batched correctly
- [ ] Batch worker flushes every 10s
- [ ] Privacy settings respected
- [ ] Redis counters accurate
```

**Frontend Tests:**
```bash
# Manual testing
- [ ] Double checkmark shows for read messages
- [ ] "Read by N" shows for groups
- [ ] Click shows read details popup
- [ ] Auto-mark on viewport works
- [ ] Debounce prevents spam
- [ ] Sync on reconnect works
```

### Definition of Done
- [x] Read receipts working for 1:1 (instant DB write + real-time notification)
- [x] Batched receipts working for groups (with read count)
- [x] Database schema implemented (read_receipts table, lastReadMessageId/lastReadAt)
- [x] WebSocket events: receipt:read, receipt:updated, receipt:count
- [x] REST endpoint: GET /api/messages/:id/receipts
- [x] REST endpoint: POST /api/messages/:id/read
- [x] Backend service implemented
- [x] FE indicators working (via WebSocket)
- [x] Swagger docs complete (schemas defined)

---

## ✅ TASK-006: Presence System

**Status:** ✅ **COMPLETE**  
**Priority:** 🔴 Critical | **Est:** 3 days | **Dependencies:** TASK-003

### Overview
Real-time presence with heartbeat, multi-device support, and privacy controls.

### Backend Scope
```typescript
// Database Schema
// Add to users table
- last_seen_at: TIMESTAMP
- presence_enabled: BOOLEAN (default: true)
- presence_sharing: ENUM('everyone', 'friends', 'nobody') (default: 'everyone')

// Redis Schema (ephemeral)
Key: presence:{user_id}
Value: JSON {
  status: 'online' | 'away',
  lastActivity: timestamp,
  devices: [
    { deviceId: string, type: 'mobile' | 'desktop', connectedAt: timestamp }
  ]
}
TTL: 30 seconds

// WebSocket Events
Client → Server:
'presence:heartbeat': { status: 'online' | 'away' }  // Every 15s

Server → Client:
'presence:update': { 
  userId: string, 
  status: 'online' | 'away' | 'offline',
  lastActivity?: string 
}

// REST Endpoints
GET /api/users/:id/presence    // Get user presence (respects privacy)

// Implementation Details
- Heartbeat: Client sends every 15s
- Server SETEX with 30s TTL
- Keyspace notifications for expiry detection
- Multi-device: Show best status across all devices
- Privacy: 'nobody' = always appear offline
```

### Frontend Scope
```typescript
// Components
<PresenceIndicator />    - Green/yellow/gray dot
<PresenceText />         - "Online", "Away", "Last seen 5m ago"

// Hooks
usePresence(userId)      - Get user presence
usePresenceHeartbeat()   - Send heartbeat

// Features
- Green dot: online
- Yellow dot: away (5min inactive)
- Gray dot: offline
- "Last seen X minutes ago" text
- Presence in conversation list and chat header
- Heartbeat management
```

### Swagger Documentation
```yaml
paths:
  /api/users/{userId}/presence:
    get:
      tags: [Presence]
      summary: Get user presence status
      security: [bearerAuth: []]
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Presence status
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId: { type: string, format: uuid }
                  status: { type: string, enum: [online, away, offline] }
                  lastActivity: { type: string, format: date-time, nullable: true }
                  lastSeenAt: { type: string, format: date-time, nullable: true }
        403: { description: Privacy settings prevent viewing }

components:
  schemas:
    Presence:
      type: object
      properties:
        userId: { type: string, format: uuid }
        status: { type: string, enum: [online, away, offline] }
        lastActivity: { type: string, format: date-time }
        devices: 
          type: array
          items:
            type: object
            properties:
              deviceId: { type: string }
              type: { type: string, enum: [mobile, desktop] }
              connectedAt: { type: string, format: date-time }
```

### Testing Strategy
**Backend Tests:**
```bash
# Send heartbeat
> {"event":"presence:heartbeat","data":{"status":"online"}}

# Get presence
curl http://localhost:3000/api/users/{id}/presence \
  -H "Authorization: Bearer {token}"

# Verify
- [ ] Heartbeat updates Redis
- [ ] TTL expires after 30s
- [ ] Offline broadcast on expiry
- [ ] Multi-device handled correctly
- [ ] Privacy settings enforced
```

**Frontend Tests:**
```bash
# Manual testing
- [ ] Green dot shows for online users
- [ ] Yellow dot after 5min inactive
- [ ] Gray dot when offline
- [ ] "Last seen" text accurate
- [ ] Presence in conversation list
- [ ] Presence in chat header
```

### Definition of Done
- [x] Heartbeat mechanism working (from TASK-003)
- [x] Presence updates in real-time (WebSocket events from TASK-003)
- [x] Multi-device support working (via presence:heartbeat)
- [x] Privacy settings respected (presenceEnabled, presenceSharing in DB)
- [x] Database schema: presence_enabled, presence_sharing fields added
- [x] REST endpoint: GET /api/users/:id/presence implemented
- [x] PresenceService implemented
- [x] Swagger docs complete

---

## ✅ TASK-007: Deployment & Observability

**Status:** ✅ **COMPLETE**  
**Priority:** 🟡 Medium | **Est:** 3 days | **Dependencies:** TASK-006

### Overview
VPS deployment with Docker Compose, monitoring, and health checks.

### Backend Scope
```typescript
// Health Check Endpoints
GET /health/live     // Liveness probe
GET /health/ready    // Readiness probe (checks DB + Redis)

// Metrics Endpoint (Prometheus)
GET /metrics

// Implementation Details
- Prometheus metrics: message latency, error rate, active connections
- Structured logging with Pino (JSON format)
- Health checks for Kubernetes/Docker
- Graceful shutdown handling

// Docker Compose Services
- app: NestJS application (replicas: 2)
- postgres: PostgreSQL 15 with persistent volume
- redis: Redis 7 with persistent volume
- nginx: Reverse proxy with SSL
- prometheus: Metrics collection
- grafana: Dashboards
```

### DevOps Scope
```yaml
# docker-compose.yml structure
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL
      - REDIS_URL
      - JWT_SECRET
    depends_on: [postgres, redis]
    deploy:
      replicas: 2
  
  postgres:
    image: postgres:15-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
  
  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
  
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
  
  prometheus:
    image: prom/prometheus
    volumes: [./prometheus.yml:/etc/prometheus/prometheus.yml]
  
  grafana:
    image: grafana/grafana
    ports: ["3001:3000"]
    volumes: [grafana_data:/var/lib/grafana]
```

### Swagger Documentation
```yaml
paths:
  /health/live:
    get:
      tags: [Health]
      summary: Liveness probe
      responses:
        200:
          description: Service is alive
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: alive }

  /health/ready:
    get:
      tags: [Health]
      summary: Readiness probe
      responses:
        200:
          description: Service is ready
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: ready }
                  checks:
                    type: object
                    properties:
                      database: { type: string, enum: [ok, error] }
                      redis: { type: string, enum: [ok, error] }
        503:
          description: Service not ready
```

### Testing Strategy
**Deployment Tests:**
```bash
# Build and run
docker-compose up -d

# Verify
- [ ] App accessible via HTTPS
- [ ] Database persists across restarts
- [ ] SSL certificate valid
- [ ] Health checks passing
- [ ] Metrics endpoint accessible
```

**Observability Tests:**
```bash
# Check metrics
curl http://localhost:3000/metrics

# Check health
curl http://localhost:3000/health/ready

# Verify
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards visible
- [ ] Logs in structured JSON format
- [ ] Alerts configured
```

### Definition of Done
- [x] Docker Compose configuration created (docker-compose.yml)
- [x] Dockerfile created for NestJS app
- [x] Health endpoints: /health/live, /health/ready implemented
- [x] Health checks passing
- [x] Nginx configuration for reverse proxy
- [x] Prometheus metrics configuration
- [x] Grafana provisioning configuration
- [x] Environment variables documented

---

## ✅ TASK-008: User Search API

**Status:** ⏳ **PENDING**  
**Priority:** 🟡 Medium | **Est:** 2 days | **Dependencies:** TASK-001

### Overview
Implement user search functionality for finding and adding contacts to conversations.

### Goal
Users can search for other users by username or display name to start conversations or add to groups.

### User Stories
- **US-8.1:** As a user, I want to search for users by username so that I can find people to chat with
- **US-8.2:** As a user, I want to search for users by display name so that I can find friends
- **US-8.3:** As a user, I want to see search results in real-time as I type so that I can find users quickly

### Zod Schemas (Shared)
```typescript
// packages/shared/src/schemas/user.ts - already exists
export const userSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.number().min(1).max(50).default(20),
});

export const userSearchResultSchema = userPublicSchema.pick({
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
});

export const userSearchResponseSchema = z.object({
  users: z.array(userSearchResultSchema),
});
```

### TDD Tests
- [ ] Schema validation tests
- [ ] API endpoint tests
- [ ] Frontend hook tests

### Backend Scope
- [ ] GET `/users/search?q={query}&limit=20` endpoint
- [ ] UsersService.search() method
- [ ] Rate limiting for search (prevent abuse)

### Frontend Scope
- [ ] useUsersSearch hook (already exists)
- [ ] Search input component in CreateChatModal
- [ ] Debounced search on input

### Definition of Done
- [ ] API returns matching users
- [ ] Frontend shows search results
- [ ] Debounced search works
- [ ] Empty results handled

---

## ✅ TASK-009: Server-Side Rate Limiting

**Status:** ⏳ **PENDING**  
**Priority:** 🔴 High | **Est:** 2 days | **Dependencies:** TASK-003

### Overview
Implement server-side rate limiting to prevent abuse and ensure fair usage.

### Goal
Protect API endpoints and WebSocket connections from excessive requests.

### User Stories
- **US-9.1:** As a system, I want to limit message sending to prevent spam
- **US-9.2:** As a system, I want to limit API calls per user to prevent abuse
- **US-9.3:** As a user, I want to see rate limit errors so I know I'm being throttled

### Zod Schemas (Shared)
```typescript
// packages/shared/src/schemas/error.ts - new
export const rateLimitErrorSchema = z.object({
  error: z.literal('RATE_LIMITED'),
  message: z.string(),
  retryAfter: z.number(),
  limit: z.number(),
  window: z.number(),
});
```

### TDD Tests
- [ ] Rate limiter unit tests
- [ ] API rate limit tests
- [ ] WebSocket rate limit tests
- [ ] Error response schema tests

### Backend Scope
- [ ] Rate limiting middleware (already has basic implementation)
- [ ] Configurable limits per endpoint
- [ ] Redis-based distributed rate limiting
- [ ] Rate limit headers in responses

### Definition of Done
- [ ] Message sending limited to 10/minute
- [ ] API calls limited appropriately
- [ ] Rate limit headers returned
- [ ] 429 responses include retry info

---

## ✅ TASK-010: Message Deduplication

**Status:** ⏳ **PENDING**  
**Priority:** 🟡 Medium | **Est:** 2 days | **Dependencies:** TASK-004

### Overview
Implement client-side and server-side message deduplication to handle network issues.

### Goal
Messages are not duplicated when network glitches occur.

### User Stories
- **US-10.1:** As a user, I want my messages to not appear twice when network reconnects
- **US-10.2:** As a user, I want to see my message status update correctly even after reconnection

### Zod Schemas (Shared)
```typescript
// packages/shared/src/schemas/message.ts - already exists
// clientMessageId field already defined
```

### TDD Tests
- [ ] Deduplication logic tests
- [ ] Client-side dedup tests
- [ ] Server-side dedup tests

### Backend Scope
- [ ] Track clientMessageId in Redis (TTL: 5 min)
- [ ] Check duplicate before processing
- [ ] Return cached response for duplicates

### Frontend Scope
- [ ] Track pending messages with clientMessageId
- [ ] Retry logic with same clientMessageId
- [ ] Clear pending on confirmation

### Definition of Done
- [ ] Duplicate messages filtered server-side
- [ ] Frontend handles retries correctly
- [ ] clientMessageId tracking works

---

## ✅ TASK-011: Home Dashboard Page

**Status:** ⏳ **PENDING**  
**Priority:** 🟡 Medium | **Est:** 3 days | **Dependencies:** TASK-006

### Overview
Create a home/dashboard page that shows conversation list and quick actions.

### Goal
Users land on a dashboard after login showing their conversations and ability to start new ones.

### User Stories
- **US-11.1:** As a user, I want to see my conversation list after logging in
- **US-11.2:** As a user, I want to start a new conversation from the home page
- **US-11.3:** As a user, I want to see my online contacts on the home page

### Zod Schemas (Shared)
```typescript
// Reuse existing conversationListResponseSchema
```

### TDD Tests
- [ ] Dashboard page renders
- [ ] Conversation list loads
- [ ] New conversation modal works

### Frontend Scope
- [ ] Create `/home` or `/dashboard` route
- [ ] Show Sidebar with conversations
- [ ] Quick action buttons (new chat, settings)
- [ ] Online contacts sidebar (optional)

### Definition of Done
- [ ] Dashboard shows after login
- [ ] Conversations list displays
- [ ] Can navigate to chat

---

## ✅ TASK-012: Settings & Profile Page

**Status:** ⏳ **PENDING**  
**Priority:** 🟡 Medium | **Est:** 3 days | **Dependencies:** TASK-011

### Overview
Create settings and profile management pages.

### Goal
Users can manage their profile, preferences, and account settings.

### User Stories
- **US-12.1:** As a user, I want to view my profile information
- **US-12.2:** As a user, I want to edit my display name
- **US-12.3:** As a user, I want to manage my privacy settings (presence sharing)

### Zod Schemas (Shared)
```typescript
// packages/shared/src/schemas/user.ts
export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const privacySettingsSchema = z.object({
  presenceSharing: z.enum(['everyone', 'friends', 'nobody']),
});
```

### TDD Tests
- [ ] Profile page renders
- [ ] Settings form validation
- [ ] Privacy toggle works

### Backend Scope
- [ ] PATCH `/users/me` endpoint
- [ ] PATCH `/users/me/privacy` endpoint
- [ ] File upload for avatar (optional)

### Frontend Scope
- [ ] Create `/settings` route
- [ ] Profile display/edit form
- [ ] Privacy settings toggle
- [ ] Logout button

### Definition of Done
- [ ] Profile page shows user info
- [ ] Can edit display name
- [ ] Privacy settings save
- [ ] Logout works

---

## 📋 Task Dependencies

```
TASK-000 (Foundation)
    │
    ▼
TASK-001 (Authentication)
    │
    ▼
TASK-002 (Conversations)
    │
    ▼
TASK-003 (WebSocket Gateway)
    │
    ├── TASK-004 (Message System)
    │       │
    │       ▼
    │   TASK-005 (Read Receipts)
    │       │
    │       ▼
    │   TASK-006 (Presence)
    │
    ▼
TASK-007 (Deployment)
```

**Parallel Work:**
- Swagger documentation can be written alongside implementation
- Frontend and backend can be developed in parallel per task
- DevOps setup can start after TASK-003

---

## 🧪 Testing Guidelines

### Swagger UI Testing
Each task includes Swagger documentation. Test via:
1. Navigate to `http://localhost:3000/api/docs`
2. Authenticate with JWT (use login endpoint)
3. Test all endpoints for that task
4. Verify request/response schemas match documentation

### End-to-End Testing
For each task, verify:
1. **Backend:** All endpoints return correct responses
2. **Frontend:** UI flows work smoothly
3. **Integration:** FE and BE communicate correctly
4. **Swagger:** Documentation is accurate and complete

### Performance Testing
- Message latency: p95 < 500ms
- API response time: p95 < 200ms
- WebSocket reconnection: < 5s

---

## 📝 Notes

- Each task is designed for 1 developer to complete in the estimated time
- Tasks build on each other - follow the dependency graph
- Swagger documentation must be kept in sync with implementation
- All tasks include both happy path and error handling
- Performance targets are mandatory, not optional

---

## 🔍 Reality Check: Codebase Audit

> **Last Audited:** 2026-02-23  
> **Auditor:** Council subagent scan (10 parallel explorers)  
> **Method:** File-by-file verification against implementation spec

This section documents the actual state of implementation versus the documented specification. Several tasks previously marked "Complete" were found to have critical gaps.

---

### ⚠️ Tasks Incorrectly Marked Complete

#### TASK-005: Read Receipts (~60% Complete)
**Documented Status:** ✅ Complete  
**Actual Status:** 🔄 In Progress

**Critical Gaps:**
1. **Group chat batching not implemented** - All receipts (1:1 and groups) write directly to DB. Missing:
   - Redis counter `read_count:{conversation_id}:{message_id}`
   - Redis queue `read_receipts:pending`
   - Batch worker with `@Interval(10000)`
2. **No frontend components:**
   - `ReadReceipt` (double checkmark) - NOT FOUND
   - `ReadReceiptDetails` (popup) - NOT FOUND
   - `ReadReceiptCount` ("Read by N") - NOT FOUND
3. **No frontend hooks:**
   - `useReadReceipts(messageId)` - NOT FOUND
   - `useMarkAsRead(conversationId)` - NOT FOUND
4. **Privacy setting missing:** `read_receipts_enabled` not in users table (only `presence_enabled` exists)

**What Works:**
- Database schema (read_receipts table, conversation_participants tracking)
- WebSocket events (receipt:read, receipt:updated, receipt:count)
- REST endpoints (GET /api/messages/:id/receipts, POST /api/messages/:id/read)
- 1:1 chat instant receipts

---

#### TASK-006: Presence System (~60% Complete)
**Documented Status:** ✅ Complete  
**Actual Status:** 🔄 In Progress

**Critical Gaps:**
1. **No keyspace notifications** - Redis expiry detection for offline broadcast not implemented
2. **No multi-device support** - Redis value only has `{status, lastSeen}`, missing `devices: [{deviceId, type, connectedAt}]` array
3. **No frontend components:**
   - `PresenceIndicator` (green/yellow/gray dot) - NOT FOUND
   - `PresenceText` ("Online", "Last seen 5m ago") - NOT FOUND
   - Only hardcoded green dot in ChatHeader.tsx exists
4. **No frontend hooks:**
   - `usePresence(userId)` - NOT FOUND
   - `usePresenceHeartbeat()` - NOT FOUND (heartbeat managed in ChatSocketService, not React hook)
5. **Duplicate services** - Two PresenceService implementations with confusing naming:
   - `apps/server/src/presence/presence.service.ts` (REST, no Redis)
   - `apps/server/src/chat/presence.service.ts` (WebSocket, with Redis)

**What Works:**
- Database schema (lastSeenAt, presenceEnabled, presenceSharing)
- WebSocket events (presence:heartbeat, presence:update)
- Heartbeat mechanism (15s client interval, 30s server TTL)
- REST endpoint (GET /api/users/:id/presence)
- Privacy settings enforced for 'nobody' option

---

#### TASK-007: Deployment & Observability (~50% Complete)
**Documented Status:** ✅ Complete  
**Actual Status:** 🔄 In Progress

**Critical Gaps:**
1. **No `/metrics` endpoint** - Prometheus expects to scrape at `/metrics` but endpoint doesn't exist
2. **No Prometheus metrics library** - `prom-client` or `@nestjs/prometheus` not in dependencies
3. **No metric implementations:**
   - Message latency histogram - MISSING
   - Error rate gauge - MISSING
   - Active connections gauge - MISSING
4. **Pino not configured** - Dependency present (v10.3.1) but NestJS Logger used instead; no JSON formatting
5. **No Grafana provisioning** - Directory referenced in docker-compose.yml but doesn't exist
6. **No graceful shutdown** - No `enableShutdownHooks()`, no SIGTERM/SIGINT handlers

**What Works:**
- Docker Compose configuration (docker-compose.yml)
- Dockerfile for NestJS app (multi-stage, Bun runtime)
- Health endpoints (/health/live, /health/ready)
- Nginx configuration (reverse proxy, WebSocket support)
- Prometheus configuration (prometheus.yml)

---

### ⏳ Pending Tasks - Detailed Gap Analysis

#### TASK-004: Message System (~70% Complete)

**Critical Gaps:**
1. **Cursor pagination not implemented** - Repository has `_cursor` parameter but no logic:
   - `findByConversation()` in repository has unused `_cursor` param
   - Controller doesn't accept `cursor` query parameter
   - No cursor encoding/decoding logic
   - Frontend `useMessages` hook expects cursor but backend ignores it
2. **Missing transaction wrapping** - Write-through doesn't wrap INSERT + UPDATE conversation in transaction
3. **Missing components/hooks:**
   - `ChatWindow` component - NOT FOUND (ChatPage serves this role)
   - `useOptimisticMessages` hook - NOT FOUND (optimistic updates in `useChatSocket` instead)

**What Works:**
- REST endpoints (GET, POST, DELETE messages)
- WebSocket events (message:send, message:sent, message:received, message:error)
- Soft delete with deleted_at
- Rate limiting (30 messages/min)
- Swagger documentation
- Server-side deduplication with Redis
- Frontend components: MessageList, MessageBubble, MessageInput, TypingIndicator

---

#### TASK-008: User Search API (~85% Complete)

**Minor Gaps:**
1. **No rate limiting** on search endpoint (no `@UseGuards(ThrottlerGuard)`)
2. **No `UsersService.search()` method** - Controller calls repository directly

**What Works:**
- GET `/users/search?q={query}&limit=20` endpoint
- `UsersRepository.searchPublicUsers()` with username/display name search
- `useUsersSearch` hook with debouncing (300ms)
- Minimum 3 character validation
- Tests for controller and hook

---

#### TASK-009: Server-Side Rate Limiting (~60% Complete)

**Critical Gaps:**
1. **No Redis-based distributed rate limiting** - Uses in-memory storage only
2. **No configurable limits per endpoint** - Hardcoded limits in guard
3. **Rate limiting not applied to:**
   - User search endpoint
4. **WebSocket rate limiting uses in-memory Map** - Should use Redis for cross-server consistency

**What Works:**
- `ThrottlerModule` configured
- `ThrottlerWithHeadersGuard` with custom headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- `Retry-After` header on 429 responses
- Auth endpoints protected (5 attempts/15min)
- Frontend rate limit error extraction

---

#### TASK-010: Message Deduplication (~90% Complete)

**Minor Gaps:**
1. **Frontend retry logic needs verification** - Retry with same `clientMessageId` partially exists but needs explicit retry mechanism
2. **Clear pending on confirmation** - Status updates exist but explicit cleanup unclear

**What Works:**
- `clientMessageId` tracking in Redis (5-min TTL)
- Duplicate checking via `reserveDedupKey()` (Redis SETNX)
- Fallback to in-memory Map if Redis unavailable
- `findByClientMessageId` repository method
- Frontend `clientMessageId` generation in `useChatSocket`

---

#### TASK-011: Home Dashboard Page (~50% Complete)

**Critical Gaps:**
1. **No `/home` or `/dashboard` route** - Root `/` goes directly to ChatPage
2. **No dedicated dashboard page component**
3. **No online contacts sidebar**

**What Works:**
- Sidebar with conversations exists (in ChatPage)
- Quick action buttons (create chat)
- Create conversation modal (CreateChatModal)
- Conversation list functionality

---

#### TASK-012: Settings & Profile Page (~40% Complete)

**Critical Gaps:**
1. **No PATCH `/users/me` endpoint** - Not found in users.controller.ts
2. **No PATCH `/users/me/privacy` endpoint** - Not found
3. **Settings UI not connected to backend** - Privacy toggle only manages local state

**What Works:**
- `/settings` route exists
- Profile display form (read-only)
- Privacy settings toggle UI (unconnected)
- Logout button functional
- `updateProfileSchema` in shared schemas

---

### 📊 Summary by Component Layer

| Layer | Status | Key Missing Pieces |
|-------|--------|-------------------|
| **Backend API** | ~85% | Message cursor pagination, profile/privacy PATCH endpoints, metrics endpoint |
| **WebSocket** | ~90% | Redis-based rate limiting storage |
| **Database** | ~95% | `read_receipts_enabled` field in users table |
| **Frontend Components** | ~50% | ReadReceipt, PresenceIndicator, PresenceText |
| **Frontend Hooks** | ~60% | useReadReceipts, useMarkAsRead, usePresence |
| **DevOps/Observability** | ~50% | Metrics endpoint, Pino logging, graceful shutdown |

---

## 🔮 Future Enhancements (Post-MVP)

- File uploads (images, documents)
- Message search (Elasticsearch)
- Push notifications
- End-to-end encryption
- Message reactions
- Thread replies
- Voice/video calls
