# RFC System Design Gaps — MVP 1-3

> **Status:** Gap Analysis Document  
> **Purpose:** Identify missing system design specifications that must be addressed before implementation  
> **Phases:** MVP 1 (Basic Chat) → MVP 2 (Read Receipts) → MVP 3 (Presence)

---

## Executive Summary

The RFC provides **high-level architecture** but lacks **implementation-level system design**. This document catalogs all missing specifications organized by MVP phase and system component.

**Critical Finding:** The RFC cannot be implemented as-is. Each section below represents a blocker that requires design decisions before coding.

---

## MVP 1: Basic Chat + Message Storage

### 1.1 Data Model Design ❌ MISSING

#### Database Schema
**Current State:** RFC mentions `messages`, `conversations`, `users` tables but provides no schema.

**Missing Specifications:**

```typescript
// REQUIRED: Complete entity definitions

// users table
- id: UUID | Auto-increment?
- username: string (unique constraints?)
- email: string (validation?)
- password_hash: string (bcrypt? argon2?)
- created_at: timestamp
- updated_at: timestamp
- avatar_url?: string
- status?: 'online' | 'offline' | 'away'  // For MVP 3

// conversations table
- id: UUID
- type: 'direct' | 'group'  // MVP 1 = only 'direct'
- title?: string  // NULL for direct messages
- created_by: FK → users.id
- created_at: timestamp
- updated_at: timestamp
- last_message_id?: FK → messages.id  // For conversation list sorting
- last_message_at?: timestamp  // Index for sorting

// conversation_participants table
- conversation_id: FK
- user_id: FK
- joined_at: timestamp
- role: 'admin' | 'member'  // MVP 1 = always 'member'
- PRIMARY KEY (conversation_id, user_id)

// messages table
- id: UUID | BIGSERIAL?
- conversation_id: FK
- sender_id: FK → users.id
- content: text (max length?)
- content_type: 'text' | 'image' | 'file'  // MVP 1 = only 'text'
- reply_to_id?: FK → messages.id  // Threading (future)
- created_at: timestamp
- updated_at: timestamp
- deleted_at?: timestamp  // Soft delete
- client_message_id?: string  // For deduplication (client-generated)

// Indexes needed:
- messages(conversation_id, created_at DESC)  // Message history queries
- messages(sender_id, created_at DESC)  // User's sent messages
- conversations(last_message_at DESC)  // Conversation list sorting
- conversation_participants(user_id)  // User's conversations lookup
```

**Design Decisions Required:**
1. **ID Strategy:** UUID (distributed-safe) vs BIGSERIAL (performance)?
2. **Soft Deletes:** Hard delete messages or soft delete with `deleted_at`?
3. **Message Ordering:** `created_at` timestamp vs auto-incrementing sequence?
4. **Content Limits:** Max message length? (Discord: 2000, Slack: 4000)
5. **Conversation Titles:** Auto-generate from participant names or allow custom?

#### Data Relationships
**Missing:** ERD showing relationships and cardinality

```
users ||--o{ conversation_participants : participates
users ||--o{ messages : sends
conversations ||--o{ conversation_participants : has
conversations ||--o{ messages : contains
conversations ||--o| messages : last_message
messages ||--o| messages : replies_to
```

---

### 1.2 API Design ❌ MISSING

#### REST Endpoints
**Current State:** RFC mentions "API routes or server functions" but no endpoints defined.

**Missing Specifications:**

```typescript
// Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh

// Conversations
GET    /api/conversations                    // List user's conversations
POST   /api/conversations                   // Create new conversation
GET    /api/conversations/:id               // Get conversation details
DELETE /api/conversations/:id               // Leave/delete conversation

// Messages
GET    /api/conversations/:id/messages      // Get message history
POST   /api/conversations/:id/messages      // Send message (also via WS)
GET    /api/conversations/:id/messages/:id  // Get single message
DELETE /api/conversations/:id/messages/:id  // Delete message

// Users
GET    /api/users/search?q=:query           // Search users (for starting chat)
GET    /api/users/:id                       // Get user profile
GET    /api/users/me                        // Get current user
```

**Design Decisions Required:**
1. **Pagination Strategy:** Cursor-based (recommended) vs offset-based?
2. **Message History:** Default page size? (20? 50? 100?)
3. **Search:** Full-text search or simple LIKE queries?
4. **Rate Limiting:** Requests per minute per endpoint?

#### Request/Response Schemas
**Missing:** JSON schemas for all endpoints

```typescript
// Example: GET /api/conversations/:id/messages
interface GetMessagesRequest {
  cursor?: string;        // Pagination cursor
  limit?: number;         // Default: 50, Max: 100
  before?: ISO8601;       // Messages before timestamp
}

interface GetMessagesResponse {
  messages: Message[];
  nextCursor?: string;    // NULL if no more messages
  hasMore: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  content: string;
  contentType: 'text';
  createdAt: string;      // ISO8601
  clientMessageId?: string;  // For deduplication
}
```

---

### 1.3 WebSocket Protocol ❌ MISSING

#### Connection Lifecycle
**Missing:** WebSocket connection and authentication flow

```
Client                                          Server
  |                                               |
  |---- CONNECT ws://api/chat?token=JWT --------->|
  |                                               |
  |<--- CONNECTION ESTABLISHED -------------------|
  |                                               |
  |---- { type: 'auth', token: 'JWT' } ---------->|  // Or token in query param
  |                                               |
  |<--- { type: 'auth_success', userId: '123' } --|
  |                                               |
  |---- { type: 'subscribe', conversationId } --->|
  |                                               |
  |<--- { type: 'subscribed', conversationId } ---|
```

**Design Decisions Required:**
1. **Auth Method:** Token in query param vs first message?
2. **Connection Timeout:** How long to wait for auth message?
3. **Max Connections:** Per user? Per IP?
4. **Heartbeat:** Ping/pong interval? (RFC mentions heartbeat in MVP 3, but needed in MVP 1 for connection health)

#### Message Event Types
**Missing:** Complete WebSocket message protocol

```typescript
// Client → Server
interface ClientEvents {
  // Authentication
  'auth': { token: string };
  
  // Subscription
  'subscribe': { conversationId: string };
  'unsubscribe': { conversationId: string };
  
  // Messaging
  'message:send': {
    conversationId: string;
    content: string;
    clientMessageId: string;  // For deduplication
    contentType?: 'text';     // Default: 'text'
  };
  
  // Typing indicators (optional for MVP 1)
  'typing:start': { conversationId: string };
  'typing:stop': { conversationId: string };
}

// Server → Client
interface ServerEvents {
  // Connection
  'auth:success': { userId: string };
  'auth:error': { error: string; code: string };
  
  // Subscription
  'subscribed': { conversationId: string };
  'unsubscribed': { conversationId: string };
  
  // Messages
  'message:received': {      // New message in subscribed conversation
    message: Message;
  };
  'message:sent': {          // Confirmation of client's send
    clientMessageId: string;
    messageId: string;
    status: 'delivered';     // MVP 1: only 'delivered', no 'read' yet
    timestamp: string;
  };
  'message:error': {         // Failed to send
    clientMessageId: string;
    error: string;
    code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'NOT_IN_CONVERSATION';
  };
  
  // Typing (optional for MVP 1)
  'typing:started': { conversationId: string; userId: string };
  'typing:stopped': { conversationId: string; userId: string };
  
  // Errors
  'error': { message: string; code: string };
}
```

**Design Decisions Required:**
1. **Message Deduplication:** How long to track `clientMessageId`? (5 min? 24 hours?)
2. **Offline Messages:** Queue messages for offline users or rely on REST API?
3. **Ordering Guarantees:** How to handle messages arriving out of order?

---

### 1.4 State Management Design ⚠️ PARTIAL

#### Optimistic Updates
**Current State:** RFC mentions TanStack Query but no optimistic update strategy.

**Missing Specifications:**

```typescript
// Optimistic update flow for message sending

// Step 1: User clicks send
// Step 2: Immediately add message to UI with 'sending' status
// Step 3: Send WebSocket event
// Step 4: On 'message:sent' confirmation → update to 'delivered'
// Step 5: On 'message:error' → show error, allow retry

interface MessageStatus {
  'sending': 'greyed out with spinner';
  'delivered': 'normal appearance';
  'error': 'red border with retry button';
}

// TanStack Query pattern
const sendMessage = useMutation({
  mutationFn: sendMessageViaWebSocket,
  onMutate: async (newMessage) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['messages', conversationId]);
    
    // Snapshot previous value
    const previousMessages = queryClient.getQueryData(['messages', conversationId]);
    
    // Optimistically update
    queryClient.setQueryData(['messages', conversationId], (old) => ({
      ...old,
      messages: [...old.messages, { ...newMessage, status: 'sending' }],
    }));
    
    return { previousMessages };
  },
  onError: (err, newMessage, context) => {
    // Rollback on error
    queryClient.setQueryData(['messages', conversationId], context.previousMessages);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries(['messages', conversationId]);
  },
});
```

**Design Decisions Required:**
1. **Optimistic Duration:** How long before showing "sending..." indicator?
2. **Retry Strategy:** Exponential backoff? Max retries?
3. **Offline Queue:** Queue messages when offline? (Service Worker?)

---

### 1.5 UI/UX Design ❌ MISSING

#### Component Architecture
**Missing:** No design system or component specifications

```
ChatPage
├── ConversationList
│   ├── ConversationItem
│   │   ├── Avatar
│   │   ├── Title
│   │   ├── LastMessagePreview
│   │   └── Timestamp
│   └── NewConversationButton
├── ChatWindow
│   ├── ChatHeader
│   │   ├── Avatar
│   │   ├── Title
│   │   └── Status (MVP 3)
│   ├── MessageList
│   │   ├── MessageGroup (by sender)
│   │   │   ├── Avatar
│   │   │   ├── MessageBubble
│   │   │   │   ├── Content
│   │   │   │   ├── Timestamp
│   │   │   │   └── StatusIndicator (sending/delivered/read)
│   │   │   └── MessageActions (delete, reply)
│   │   └── LoadMoreTrigger (infinite scroll)
│   ├── TypingIndicator (optional)
│   └── MessageInput
│       ├── TextArea (auto-resize)
│       ├── SendButton
│       └── AttachmentButton (future)
└── ConnectionStatusBar (disconnected/reconnecting)
```

**Missing Specifications:**
1. **Responsive Design:** Mobile breakpoint? Sidebar behavior on mobile?
2. **Message Bubbles:** Own messages right-aligned, others left-aligned?
3. **Timestamps:** Absolute ("2:30 PM") vs relative ("2 minutes ago")?
4. **Empty States:** No conversations? No messages in conversation?
5. **Loading States:** Skeleton screens vs spinners?
6. **Error States:** Failed to load messages? Failed to send?

#### Design Tokens
**Missing:** No color palette, typography, spacing defined

```css
/* Required design tokens */
:root {
  /* Colors */
  --color-primary: ?;
  --color-background: ?;
  --color-surface: ?;
  --color-text-primary: ?;
  --color-text-secondary: ?;
  --color-sent-message: ?;
  --color-received-message: ?;
  
  /* Spacing */
  --spacing-xs: ?;
  --spacing-sm: ?;
  --spacing-md: ?;
  --spacing-lg: ?;
  
  /* Typography */
  --font-family: ?;
  --font-size-sm: ?;
  --font-size-md: ?;
  --font-size-lg: ?;
  
  /* Shadows */
  --shadow-message: ?;
  
  /* Border radius */
  --radius-message: ?;
}
```

---

### 1.6 Security Design ❌ MISSING

**Missing Specifications:**

```typescript
// Authentication
- JWT secret key management (env var?)
- Token expiration (access: 15min? refresh: 7 days?)
- Refresh token rotation?
- Password requirements (min length? complexity?)

// Authorization
- Can users delete other users' messages? (admin only?)
- Who can add/remove participants? (MVP 2+)
- Conversation visibility rules

// Rate Limiting
interface RateLimits {
  'auth:login': '5 attempts per 15 minutes per IP';
  'message:send': '30 messages per minute per user';
  'conversation:create': '10 per hour per user';
  'websocket:connect': '10 connections per minute per IP';
}

// Input Validation
- Message content: Max 4000 chars? Profanity filter?
- Username: Min 3, max 30 chars? Allowed characters?
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize HTML in messages?)
```

---

## MVP 2: Read Receipts

### 2.1 Data Model Extensions ❌ MISSING

**Missing Specifications:**

```typescript
// read_receipts table (batched from Redis)
- message_id: FK
- user_id: FK
- read_at: timestamp
- PRIMARY KEY (message_id, user_id)

// conversation_participants table (add column)
- last_read_message_id?: FK → messages.id  // For offline sync
- last_read_at?: timestamp

// Redis counters (for groups)
Key pattern: `read_count:{conversation_id}:{message_id}`
Value: Integer counter
TTL: 24 hours

// Redis batch queue
Key pattern: `read_receipts:pending`
Value: JSON array of { messageId, userId, readAt }
```

**Design Decisions Required:**
1. **Batch Flush Trigger:** Cron job (every 10s)? Event-driven? Both?
2. **Counter Strategy:** Per-message counter or per-conversation counter?
3. **Privacy:** Can users disable read receipts? (per-conversation? global?)

### 2.2 Read Receipt Logic ❌ MISSING

**Missing Specifications:**

```typescript
// When to mark as read?
interface ReadReceiptRules {
  // Option A: Mark read when message enters viewport
  'viewport': 'IntersectionObserver with 50% threshold';
  
  // Option B: Mark read when user clicks/focuses chat
  'focus': 'Window focus + conversation active';
  
  // Option C: Mark read when user sends reply
  'reply': 'Implicit read on send';
}

// Read receipt events
interface ReadReceiptEvents {
  // Client → Server
  'receipt:read': {
    conversationId: string;
    messageIds: string[];  // Batch multiple messages
    lastReadMessageId: string;
  };
  
  // Server → Client (1:1 chats)
  'receipt:updated': {
    conversationId: string;
    messageId: string;
    readBy: { userId: string; readAt: string };
  };
  
  // Server → Client (groups - aggregated)
  'receipt:count': {
    conversationId: string;
    messageId: string;
    readCount: number;
    totalParticipants: number;
  };
}

// Offline sync
interface OfflineSync {
  // On reconnect:
  // 1. Client sends last_read_message_id per conversation
  // 2. Server marks all messages before that as read
  // 3. Server sends unread message count
  // 4. Server sends which messages were read while offline
}
```

**Design Decisions Required:**
1. **Read Threshold:** How long must message be visible to count as "read"? (1s? 3s?)
2. **Group Aggregation:** Show "Read by 5/10" or list of names?
3. **Own Messages:** Do you see your own read receipts?

### 2.3 UI Design for Read Receipts ❌ MISSING

**Missing Specifications:**

```typescript
interface ReadReceiptUI {
  // 1:1 Chat
  'singleTick': 'Message sent (stored in DB)';
  'doubleTick': 'Message delivered to recipient';
  'blueTick': 'Message read by recipient';
  'timestamp': 'Read at 2:30 PM';
  
  // Group Chat
  'count': '✓✓ 5';  // Read by 5 people
  'popover': 'Click to see who read';  // List of names + times
}

// Edge cases
interface ReadReceiptEdgeCases {
  'partialRead': 'Some participants read, some not';
  'offlineRead': 'Read while offline, synced on reconnect';
  'deletedMessage': 'Read receipt for deleted message?';
}
```

---

## MVP 3: Presence

### 3.1 Presence Data Model ❌ MISSING

**Missing Specifications:**

```typescript
// Redis presence keys
Key pattern: `presence:{user_id}`
Value: JSON {
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: timestamp;
  deviceInfo?: string;
  currentConversationId?: string;  // Optional: "typing in..."
}
TTL: 30 seconds (refreshed by heartbeat)

// PostgreSQL (for persistent last-seen)
// users table (add column)
- last_seen_at?: timestamp;  // Updated on disconnect

// Presence events
interface PresenceEvents {
  // Client → Server
  'presence:heartbeat': {
    status: 'online' | 'away';
  };
  'presence:update': {
    status: 'online' | 'away' | 'busy';
  };
  
  // Server → Client
  'presence:update': {
    userId: string;
    status: 'online' | 'offline' | 'away';
    lastSeen?: timestamp;  // Only for offline
  };
}
```

**Design Decisions Required:**
1. **Heartbeat Interval:** 15s? 30s? (Must be < TTL)
2. **Away Detection:** Automatic after X minutes of inactivity? Manual?
3. **Multi-Device:** Show "online on mobile" vs "online on desktop"?
4. **Privacy:** Can users hide presence? (per-user setting?)

### 3.2 Presence Lifecycle ❌ MISSING

**Missing Specifications:**

```
User connects:
  1. SET presence:{user_id} "online" EX 30
  2. Broadcast to all friends/conversation participants
  3. Update users.last_seen_at = NULL

Heartbeat (every 15s):
  1. EXPIRE presence:{user_id} 30
  2. If status changed, update value

User disconnects:
  1. WebSocket close detected
  2. Wait 5s (grace period for reconnect)
  3. If no reconnect: DEL presence:{user_id}
  4. Broadcast "offline" to subscribers
  5. Update users.last_seen_at = NOW()

TTL expiry (Redis handles):
  1. Key expires after 30s of no heartbeat
  2. Broadcast "offline" to subscribers
  3. Update users.last_seen_at = NOW()
```

**Design Decisions Required:**
1. **Grace Period:** How long to wait for reconnect before marking offline? (5s? 30s?)
2. **Subscription Model:** Subscribe to all friends? Only active conversations?
3. **Fan-out:** How to efficiently broadcast presence to thousands of subscribers?

### 3.3 Presence UI Design ❌ MISSING

**Missing Specifications:**

```typescript
interface PresenceUI {
  // Avatar indicators
  'online': 'Green dot';
  'away': 'Yellow dot';
  'busy': 'Red dot';
  'offline': 'Grey dot or no indicator';
  
  // Last seen text
  'lastSeen': 'Last seen 5 minutes ago';
  'lastSeenToday': 'Last seen today at 2:30 PM';
  'lastSeenYesterday': 'Last seen yesterday';
  'lastSeenDate': 'Last seen Jan 15';
  
  // Conversation list
  'onlineCount': '3 online';  // For groups
  'typing': 'Alice is typing...';  // Optional
}
```

---

## Cross-Cutting Concerns

### 4.1 Scalability Design ❌ MISSING

**Horizontal Scaling:**

```
Current RFC assumes single server. For scale:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Load Balancer│────▶│  WS Server 1│
└─────────────┘     │   (sticky)    │     ├─────────────┤
                    └─────────────┘     │  WS Server 2│
                           │            ├─────────────┤
                           │            │  WS Server N│
                           ▼            └─────────────┘
                    ┌─────────────┐            │
                    │   Redis     │◀───────────┘
                    │  Pub/Sub    │    (broadcast across servers)
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

**Missing Specifications:**
1. **Sticky Sessions:** Required for WebSocket (IP hash? Cookie-based?)
2. **Redis Pub/Sub:** Channel naming convention? Message format?
3. **Database:** Read replicas? Connection pooling?
4. **Caching:** Message cache in Redis? TTL?

### 4.2 Observability Design ❌ MISSING

**Missing Specifications:**

```typescript
// Metrics to track
interface ChatMetrics {
  // Message flow
  'message.send_latency': 'Time from send click to DB write';
  'message.delivery_latency': 'Time from DB write to recipient receive';
  'message.delivery_rate': 'Percentage delivered within 3 seconds';
  
  // WebSocket
  'websocket.connections': 'Active connections';
  'websocket.messages_per_second': 'Throughput';
  'websocket.errors': 'Connection errors';
  
  // Read receipts
  'receipt.sync_latency': 'Time to sync on reconnect';
  
  // Presence
  'presence.accuracy': 'Correct online/offline percentage';
  'presence.false_positive': 'Marked offline while online';
}

// Logging
interface LogEvents {
  'message.sent': { userId, conversationId, messageId, latency };
  'message.delivered': { messageId, recipientId, latency };
  'websocket.connected': { userId, ip, userAgent };
  'websocket.disconnected': { userId, duration, reason };
  'presence.changed': { userId, from, to };
}

// Alerting thresholds
interface Alerts {
  'message_delivery_p95': '> 3 seconds';
  'websocket_error_rate': '> 1%';
  'db_connection_pool': '> 80% utilization';
}
```

### 4.3 Error Handling Strategy ❌ MISSING

**Missing Specifications:**

```typescript
// Error categories
interface ErrorHandling {
  // Client-side errors (validation)
  'VALIDATION_ERROR': 'Show inline error, don\'t send';
  
  // Network errors (retryable)
  'NETWORK_ERROR': 'Exponential backoff retry, show "sending..."';
  'TIMEOUT': 'Retry 3 times, then show "failed - retry?"';
  
  // Server errors (may retry)
  'RATE_LIMITED': 'Wait X seconds (from Retry-After header), retry';
  'DB_ERROR': 'Retry with backoff';
  
  // Fatal errors (don't retry)
  'UNAUTHORIZED': 'Redirect to login';
  'NOT_IN_CONVERSATION': 'Show error, remove from UI';
  'MESSAGE_TOO_LARGE': 'Show error, allow edit';
}

// Three-second problem handling
interface ThreeSecondProblem {
  // If message not delivered in 3 seconds:
  'ui_indicator': 'Show warning "Message taking longer than usual"';
  'user_action': 'Allow cancel and retry';
  'background': 'Continue retrying with backoff';
  'escalation': 'Alert dev team if >10% of messages exceed 3s';
}
```

---

## Implementation Priority Matrix

| Component | MVP 1 | MVP 2 | MVP 3 | Blocker Level |
|-----------|-------|-------|-------|---------------|
| Database Schema | 🔴 Critical | 🔴 Critical | 🔴 Critical | Cannot start without |
| REST API Spec | 🔴 Critical | 🟡 Medium | 🟢 Low | Blocks frontend development |
| WebSocket Protocol | 🔴 Critical | 🔴 Critical | 🔴 Critical | Core feature |
| Optimistic Updates | 🟡 Medium | 🟢 Low | 🟢 Low | Needed for good UX |
| UI Components | 🟡 Medium | 🟡 Medium | 🟡 Medium | Can use placeholders |
| Rate Limiting | 🟡 Medium | 🟢 Low | 🟢 Low | Security requirement |
| Read Receipt Logic | - | 🔴 Critical | 🟢 Low | Core MVP 2 feature |
| Presence Logic | - | - | 🔴 Critical | Core MVP 3 feature |
| Scalability Design | 🟢 Low | 🟢 Low | 🟡 Medium | Needed for production |
| Observability | 🟢 Low | 🟢 Low | 🟡 Medium | Needed for production |

---

## Next Steps

1. **Design Database Schema** - Create ERD and migration files
2. **Design WebSocket Protocol** - Document all event types and flows
3. **Design REST API** - Define endpoints, request/response schemas
4. **Create UI Component Specs** - Design system, wireframes, states
5. **Design Security Model** - Auth flows, rate limits, validation rules
6. **Design Scalability Strategy** - Horizontal scaling, Redis Pub/Sub

**Recommendation:** Do not start implementation until at least items 1-3 are designed.
