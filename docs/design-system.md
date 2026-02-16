# Chat System Design System

> **Status:** Draft
> **Scope:** Design tokens (frontend + backend) and component architecture (frontend + backend)
> **Tech Stack:** NestJS 11.x + Vite 7.x + React 19.x + TanStack Query 5.x + Drizzle 0.45.x + PostgreSQL + Redis + Bun Monorepo
> **Reference:** Aligned with the Three-Second Problem and Three Pillars (Message Storage, Read Receipts, Presence)

---

## Table of Contents

- [1. Design Tokens — Frontend](#1-design-tokens--frontend)
  - [1.1 Colors](#11-colors)
  - [1.2 Typography](#12-typography)
  - [1.3 Spacing](#13-spacing)
  - [1.4 Shadows & Borders](#14-shadows--borders)
  - [1.5 Breakpoints](#15-breakpoints)
  - [1.6 Animation](#16-animation)
- [2. Design Tokens — Backend](#2-design-tokens--backend)
  - [2.1 WebSocket Event Naming](#21-websocket-event-naming)
  - [2.2 API Response Shape](#22-api-response-shape)
  - [2.3 Error Shape](#23-error-shape)
  - [2.4 Rate Limit Headers](#24-rate-limit-headers)
- [3. Component Architecture — Frontend](#3-component-architecture--frontend)
  - [3.1 Component Tree](#31-component-tree)
  - [3.2 Core Design Pattern: MessageStatus State Machine](#32-core-design-pattern-messagestatus-state-machine)
  - [3.3 Component Specifications](#33-component-specifications)
  - [3.4 State Management Boundaries](#34-state-management-boundaries)
- [4. Component Architecture — Backend](#4-component-architecture--backend)
  - [4.1 NestJS Module Structure](#41-nestjs-module-structure)
  - [4.2 Service Layer](#42-service-layer)
  - [4.3 Gateway Architecture](#43-gateway-architecture)
  - [4.4 Data Flow: Write-Through Lifecycle](#44-data-flow-write-through-lifecycle)

---

## 1. Design Tokens — Frontend

### 1.1 Colors

```css
:root {
  /* --- Brand --- */
  --color-primary: #2563eb;           /* Primary actions, links */
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;     /* Selection highlights */

  /* --- Surface --- */
  --color-bg: #ffffff;                /* Page background */
  --color-surface: #f8fafc;           /* Cards, sidebar background */
  --color-surface-hover: #f1f5f9;     /* Hover state on surfaces */
  --color-border: #e2e8f0;            /* Dividers, input borders */

  /* --- Text --- */
  --color-text-primary: #0f172a;      /* Headings, body text */
  --color-text-secondary: #64748b;    /* Timestamps, metadata */
  --color-text-tertiary: #94a3b8;     /* Placeholders, disabled */
  --color-text-inverse: #ffffff;      /* Text on primary backgrounds */

  /* --- Message Bubbles --- */
  --color-bubble-sent: #2563eb;       /* Own messages */
  --color-bubble-sent-text: #ffffff;
  --color-bubble-received: #f1f5f9;   /* Others' messages */
  --color-bubble-received-text: #0f172a;

  /* --- Status Indicators (Presence) --- */
  --color-status-online: #22c55e;     /* Green dot */
  --color-status-away: #eab308;       /* Yellow dot */
  --color-status-offline: #94a3b8;    /* Grey dot */
  --color-status-busy: #ef4444;       /* Red dot (future) */

  /* --- Message Status (Ticks) --- */
  --color-tick-sending: #94a3b8;      /* Grey — pending */
  --color-tick-delivered: #64748b;    /* Dark grey — confirmed write-through */
  --color-tick-read: #2563eb;         /* Blue — read receipt confirmed */
  --color-tick-error: #ef4444;        /* Red — send failed */

  /* --- Semantic --- */
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* --- Connection Status Bar --- */
  --color-connection-connected: #22c55e;
  --color-connection-reconnecting: #eab308;
  --color-connection-disconnected: #ef4444;
}
```

### 1.2 Typography

```css
:root {
  /* --- Font Family --- */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* --- Font Size (modular scale, base 16px) --- */
  --font-size-xs: 0.75rem;    /* 12px — timestamps, metadata */
  --font-size-sm: 0.875rem;   /* 14px — secondary text, captions */
  --font-size-md: 1rem;       /* 16px — body text, messages */
  --font-size-lg: 1.125rem;   /* 18px — conversation titles */
  --font-size-xl: 1.25rem;    /* 20px — page headings */
  --font-size-2xl: 1.5rem;    /* 24px — main title */

  /* --- Font Weight --- */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* --- Line Height --- */
  --line-height-tight: 1.25;  /* Headings */
  --line-height-normal: 1.5;  /* Body text, messages */
  --line-height-relaxed: 1.75; /* Long-form content */
}
```

### 1.3 Spacing

4px base unit. All spacing values are multiples of 4.

```css
:root {
  --spacing-0: 0;
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
}
```

**Usage conventions:**
| Context | Token |
|---------|-------|
| Message bubble padding | `--spacing-3` (12px) |
| Gap between messages from same sender | `--spacing-1` (4px) |
| Gap between message groups (different sender) | `--spacing-4` (16px) |
| Sidebar item padding | `--spacing-3` vertical, `--spacing-4` horizontal |
| Section gaps | `--spacing-6` (24px) |
| Page margins | `--spacing-4` mobile, `--spacing-8` desktop |

### 1.4 Shadows & Borders

```css
:root {
  /* --- Shadows --- */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* --- Border Radius --- */
  --radius-sm: 0.25rem;    /* 4px — small elements */
  --radius-md: 0.5rem;     /* 8px — inputs, cards */
  --radius-lg: 0.75rem;    /* 12px — message bubbles */
  --radius-xl: 1rem;       /* 16px — modals, large cards */
  --radius-full: 9999px;   /* Avatars, status dots, pills */

  /* --- Border Width --- */
  --border-width: 1px;
}
```

**Message bubble radius convention:**
```
Sent messages (right-aligned):
  First in group:  radius-lg radius-lg radius-sm radius-lg
  Middle:          radius-lg radius-sm radius-sm radius-lg
  Last in group:   radius-lg radius-sm radius-lg radius-lg
  Solo:            radius-lg radius-lg radius-lg radius-lg

Received messages (left-aligned): mirror of above
```

### 1.5 Breakpoints

```css
/* Mobile-first breakpoints */
--breakpoint-sm: 640px;    /* Small phones → large phones */
--breakpoint-md: 768px;    /* Phones → tablets */
--breakpoint-lg: 1024px;   /* Tablets → desktops */
--breakpoint-xl: 1280px;   /* Desktops → wide screens */
```

**Layout behavior:**

| Breakpoint | Sidebar | Chat Window | Behavior |
|------------|---------|-------------|----------|
| < 768px | Full width (overlay) | Full width | Tap conversation → slide to chat. Back button → slide to list. |
| 768px–1024px | 280px fixed | Remaining width | Side-by-side, sidebar collapsible |
| > 1024px | 320px fixed | Remaining width | Side-by-side, always visible |

### 1.6 Animation

```css
:root {
  /* --- Duration --- */
  --duration-fast: 100ms;     /* Hover, focus states */
  --duration-normal: 200ms;   /* Transitions, slides */
  --duration-slow: 300ms;     /* Modal open/close */

  /* --- Easing --- */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

**Chat-specific animations:**

| Element | Animation | Duration | Notes |
|---------|-----------|----------|-------|
| New message appear | Slide up + fade in | `--duration-normal` | Own messages from right, others from left |
| Typing indicator | Three-dot pulse (looping) | 1.4s cycle | Staggered 200ms per dot |
| Presence dot | Fade transition | `--duration-fast` | No pulse for online — static dot |
| Connection status bar | Slide down from top | `--duration-normal` | Stays visible until reconnected |
| Message status tick | Crossfade | `--duration-fast` | sending → delivered → read |
| Sidebar slide (mobile) | Translate X | `--duration-slow` | Slide in from left |

---

## 2. Design Tokens — Backend

### 2.1 WebSocket Event Naming

All WebSocket events follow the `namespace:action` pattern. Namespaces map to domain concepts from the three pillars.

```typescript
// Naming convention: {namespace}:{action}

// --- Authentication ---
'auth'                    // Client → Server: send JWT
'auth:success'            // Server → Client: authenticated
'auth:error'              // Server → Client: auth failed

// --- Subscriptions ---
'subscribe'               // Client → Server: join conversation room
'unsubscribe'             // Client → Server: leave conversation room
'subscribed'              // Server → Client: joined
'unsubscribed'            // Server → Client: left

// --- Messages (Pillar 1: Message Storage) ---
'message:send'            // Client → Server: send message
'message:received'        // Server → Client: new message in conversation
'message:sent'            // Server → Client: confirmation (write-through complete)
'message:error'           // Server → Client: send failed
'message:deleted'         // Server → Client: message removed

// --- Typing ---
'typing:start'            // Client → Server
'typing:stop'             // Client → Server
'typing:started'          // Server → Client: user is typing
'typing:stopped'          // Server → Client: user stopped typing

// --- Read Receipts (Pillar 2) ---
'receipt:read'            // Client → Server: mark messages as read
'receipt:updated'         // Server → Client: 1:1 read receipt
'receipt:count'           // Server → Client: group aggregated count

// --- Presence (Pillar 3) ---
'presence:heartbeat'      // Client → Server: keep-alive (every 15s)
'presence:update'         // Server → Client: user status changed

// --- System ---
'error'                   // Server → Client: generic error
'ping'                    // Bidirectional: connection health
'pong'                    // Bidirectional: connection health
```

**Naming rules:**
1. Client-to-server events use the imperative: `message:send`, `typing:start`
2. Server-to-client events use past tense or state: `message:received`, `typing:started`
3. Confirmations mirror the client event name: `message:send` → `message:sent`
4. Errors append `:error` to the namespace: `message:error`, `auth:error`

### 2.2 API Response Shape

All REST endpoints return a consistent envelope.

```typescript
// Success response
interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;       // Pagination: opaque cursor for next page
    hasMore?: boolean;     // Pagination: more results available
    total?: number;        // Optional: total count (expensive, only when needed)
  };
}

// Example: GET /api/conversations/:id/messages
{
  "data": [
    {
      "id": "msg_abc123",
      "conversationId": "conv_xyz",
      "senderId": "usr_456",
      "content": "Hello",
      "contentType": "text",
      "status": "delivered",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "clientMessageId": "client_uuid_789"
    }
  ],
  "meta": {
    "cursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1In0=",
    "hasMore": true
  }
}
```

**ID prefix convention:**
| Entity | Prefix | Example |
|--------|--------|---------|
| User | `usr_` | `usr_abc123` |
| Conversation | `conv_` | `conv_xyz789` |
| Message | `msg_` | `msg_def456` |
| Read receipt | `rr_` | `rr_ghi012` |

**Timestamp convention:** All timestamps are ISO 8601 UTC strings: `"2024-01-15T10:30:00.000Z"`

### 2.3 Error Shape

```typescript
// Error response (all endpoints)
interface ApiError {
  error: {
    code: string;           // Machine-readable: 'VALIDATION_ERROR'
    message: string;        // Human-readable: 'Content exceeds 4000 characters'
    details?: Record<string, string[]>;  // Field-level errors (validation)
    retryable: boolean;     // Client hint: safe to retry?
    retryAfter?: number;    // Seconds to wait before retry (rate limiting)
  };
}

// Example: validation error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid message content",
    "details": {
      "content": ["Content must be between 1 and 4000 characters"]
    },
    "retryable": false
  }
}

// Example: rate limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryable": true,
    "retryAfter": 30
  }
}
```

**Error code catalog:**

| Code | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| `VALIDATION_ERROR` | 400 | No | Bad input, client should fix |
| `UNAUTHORIZED` | 401 | No | Token missing/expired → redirect to login |
| `FORBIDDEN` | 403 | No | Not a participant in conversation |
| `NOT_FOUND` | 404 | No | Resource deleted or never existed |
| `RATE_LIMITED` | 429 | Yes | Wait `retryAfter` seconds |
| `CONFLICT` | 409 | No | Duplicate `clientMessageId` (dedup hit) |
| `DB_ERROR` | 503 | Yes | Database unavailable, retry with backoff |
| `REDIS_UNAVAILABLE` | 503 | Yes | Redis down, fallback mode |
| `INTERNAL_ERROR` | 500 | Yes | Unexpected failure, retry once |

### 2.4 Rate Limit Headers

Every API response includes rate limit headers:

```
X-RateLimit-Limit: 30          // Max requests in window
X-RateLimit-Remaining: 27      // Remaining requests
X-RateLimit-Reset: 1705312200  // Unix timestamp when window resets
Retry-After: 30                // Seconds (only on 429 responses)
```

**Rate limits by endpoint:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/login` | 5 | 15 min |
| `POST /api/auth/register` | 3 | 1 hour |
| `POST /api/conversations/:id/messages` | 30 | 1 min |
| `GET /api/conversations/:id/messages` | 60 | 1 min |
| WebSocket `message:send` | 30 | 1 min |
| WebSocket connect | 10 | 1 min |

---

## 3. Component Architecture — Frontend

### 3.1 Component Tree

```
App
├── ConnectionStatusBar              // "Reconnecting..." / "Disconnected"
│
├── ChatPage                         // Main layout container
│   ├── ConversationList             // Left sidebar
│   │   ├── SearchInput              // Search/filter conversations
│   │   ├── NewConversationButton
│   │   └── ConversationItem[]       // Repeating list items
│   │       ├── Avatar               // With PresenceIndicator overlay
│   │       │   └── PresenceIndicator  // Green/yellow/grey dot
│   │       ├── ConversationTitle
│   │       ├── LastMessagePreview
│   │       ├── Timestamp            // Relative: "2m ago"
│   │       └── UnreadBadge          // Count or dot
│   │
│   └── ChatWindow                   // Right panel
│       ├── ChatHeader
│       │   ├── Avatar + PresenceIndicator
│       │   ├── ConversationTitle
│       │   └── PresenceText         // "Online" / "Last seen 5m ago"
│       │
│       ├── MessageList              // Virtualized scrollable area
│       │   ├── LoadMoreTrigger      // Infinite scroll (up) for history
│       │   ├── DateSeparator        // "Today", "Yesterday", "Jan 15"
│       │   └── MessageGroup[]       // Grouped by sender + time window
│       │       ├── SenderAvatar     // Only for received messages
│       │       └── MessageBubble[]
│       │           ├── MessageContent   // Text (future: images, files)
│       │           ├── MessageTimestamp  // "2:30 PM"
│       │           ├── MessageStatusIcon // Ticks: sending/delivered/read/error
│       │           └── MessageActions   // Hover: delete, reply (future)
│       │
│       ├── TypingIndicator          // "Alice is typing..."
│       │
│       └── MessageInput
│           ├── TextArea             // Auto-resize, max height
│           └── SendButton           // Disabled when empty
│
├── EmptyState                       // No conversation selected
│
└── AuthPages                        // Login, Register (separate routes)
```

### 3.2 Core Design Pattern: MessageStatus State Machine

This is the central UX pattern that maps directly to the Three-Second Problem. Every message has a status that drives its visual appearance.

```
                 ┌──────────┐
                 │ composing │  (in input, not yet sent)
                 └────┬─────┘
                      │ User clicks Send
                      ▼
                 ┌──────────┐
                 │ sending   │  Grey tick, optimistic UI
                 └────┬─────┘
                      │ Server confirms write-through (message:sent)
            ┌─────────┴─────────┐
            ▼                   ▼
       ┌──────────┐       ┌──────────┐
       │ delivered │       │  error   │  Red tick, retry button
       └────┬─────┘       └──────────┘
            │ Recipient reads (receipt:updated)
            ▼
       ┌──────────┐
       │   read   │  Blue double tick
       └──────────┘
```

**Visual mapping:**

| Status | Icon | Color Token | UI Behavior |
|--------|------|-------------|-------------|
| `sending` | Single tick (outlined) | `--color-tick-sending` | Optimistic: message appears instantly in bubble |
| `delivered` | Single tick (filled) | `--color-tick-delivered` | Write-through confirmed, message persisted to DB |
| `read` | Double tick | `--color-tick-read` | 1:1: blue ticks. Group: "Read by 5" count |
| `error` | Exclamation circle | `--color-tick-error` | Show retry button, message stays in position |

**Three-Second Problem rule:** If a message stays in `sending` for more than 3 seconds, show a subtle warning: "Taking longer than usual..." below the message bubble. The message remains in position (no removal, no reordering).

### 3.3 Component Specifications

#### ConnectionStatusBar

Visible only when WebSocket is not connected. Positioned fixed at top of viewport.

| State | Background | Text | Action |
|-------|------------|------|--------|
| Reconnecting | `--color-connection-reconnecting` | "Reconnecting..." | Auto-retry (exponential backoff: 1s, 2s, 4s, 8s, max 30s) |
| Disconnected | `--color-connection-disconnected` | "Connection lost. Tap to retry." | Manual retry button |
| Connected | `--color-connection-connected` | "Connected" | Auto-hide after 2 seconds |

#### ConversationItem

| State | Appearance |
|-------|------------|
| Default | Surface background, normal weight title |
| Selected | Primary-light background, semibold title |
| Unread | Bold title, unread badge visible, last message preview in `--color-text-primary` |
| Hover | Surface-hover background |
| Empty (no messages) | Tertiary text: "No messages yet" |

#### MessageBubble

| Prop | Type | Notes |
|------|------|-------|
| `content` | string | Max 4000 chars |
| `isSent` | boolean | Determines alignment and bubble color |
| `status` | `'sending' \| 'delivered' \| 'read' \| 'error'` | Drives status icon |
| `timestamp` | ISO 8601 string | Displayed as "2:30 PM" |
| `showAvatar` | boolean | True for first message in received group |
| `bubblePosition` | `'solo' \| 'first' \| 'middle' \| 'last'` | Determines border radius |

#### PresenceIndicator

| Status | Color | Size | Position |
|--------|-------|------|----------|
| Online | `--color-status-online` | 10px | Bottom-right of avatar |
| Away | `--color-status-away` | 10px | Bottom-right of avatar |
| Offline | `--color-status-offline` | 10px | Bottom-right of avatar, or hidden |

**PresenceText** (in ChatHeader):

| Status | Text |
|--------|------|
| Online | "Online" |
| Away | "Away" |
| Offline, < 1 hour | "Last seen X minutes ago" |
| Offline, today | "Last seen today at 2:30 PM" |
| Offline, yesterday | "Last seen yesterday" |
| Offline, older | "Last seen Jan 15" |

#### TypingIndicator

Visible when at least one other participant is typing. Auto-hides after 5 seconds of no `typing:started` events.

| Participants typing | Display |
|---------------------|---------|
| 1 | "Alice is typing..." |
| 2 | "Alice and Bob are typing..." |
| 3+ | "Alice and 2 others are typing..." |

Animation: Three dots with staggered opacity pulse (1.4s cycle, 200ms stagger per dot).

#### ReadReceiptDisplay (Group Messages)

Hybrid approach per goal.md (Telegram pattern):

| Context | Display | Data source |
|---------|---------|-------------|
| 1:1 chat | Blue double tick on sender's message | Direct DB write via `receipt:updated` |
| Group, own message | "Read by 5" text below bubble | Redis counter via `receipt:count` |
| Group, tap "Read by 5" | Popover: list of names + read times | REST: `GET /api/messages/:id/receipts` |

### 3.4 State Management Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    TanStack Query                        │
│  (server state — cached, deduplicated, stale-revalidate) │
│                                                          │
│  • Conversation list       queryKey: ['conversations']   │
│  • Message history         queryKey: ['messages', convId] │
│  • User profile            queryKey: ['user', 'me']      │
│  • Read receipt counts     queryKey: ['receipts', convId] │
│  • User search results     queryKey: ['users', query]     │
│                                                          │
│  Updated by:                                             │
│  - REST fetch (initial load, pagination)                 │
│  - queryClient.setQueryData() on WebSocket events        │
│  - queryClient.invalidateQueries() on reconnect          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    React State (local)                    │
│  (UI state — ephemeral, component-scoped)                │
│                                                          │
│  • Message input text      useState in MessageInput      │
│  • Selected conversation   useState in ChatPage          │
│  • Sidebar open/closed     useState in ChatPage (mobile) │
│  • Typing indicator state  useState in ChatWindow        │
│  • Modal open/closed       useState in component         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    WebSocket (event bus)                  │
│  (real-time — pushes into TanStack Query or local state) │
│                                                          │
│  • message:received  → setQueryData(['messages', convId])│
│  • message:sent      → update message status in cache    │
│  • receipt:updated   → setQueryData(['receipts', convId])│
│  • receipt:count     → setQueryData(['receipts', convId])│
│  • presence:update   → setQueryData(['presence', userId])│
│  • typing:started    → set local typing state            │
│  • typing:stopped    → clear local typing state          │
│                                                          │
│  Managed by: useEffect (connect/disconnect lifecycle)    │
│  NOT used for: data fetching (that's TanStack Query)     │
└─────────────────────────────────────────────────────────┘
```

**Reconnect flow** (Signal pattern from goal.md):

```
1. WebSocket disconnects → ConnectionStatusBar shows "Reconnecting..."
2. Exponential backoff retry: 1s, 2s, 4s, 8s, max 30s
3. On reconnect:
   a. Re-authenticate (send 'auth' event with current JWT)
   b. Re-subscribe to active conversation
   c. Send batch read receipt: { lastReadMessageId } per conversation
   d. Invalidate TanStack Query caches:
      - queryClient.invalidateQueries(['messages'])
      - queryClient.invalidateQueries(['conversations'])
      - queryClient.invalidateQueries(['receipts'])
   e. TanStack Query refetches stale data in background
   f. ConnectionStatusBar shows "Connected" → auto-hide after 2s
4. No unread badge flickering (server reconciles from lastReadMessageId)
```

---

## 4. Component Architecture — Backend

### 4.1 NestJS Module Structure

```
src/
├── app.module.ts                    // Root module
│
├── auth/                            // AuthModule
│   ├── auth.module.ts
│   ├── auth.controller.ts           // POST /auth/login, /register, /refresh, /logout
│   ├── auth.service.ts              // JWT generation, password hashing, token rotation
│   ├── auth.guard.ts                // HTTP route guard (JWT validation)
│   ├── ws-auth.guard.ts             // WebSocket connection guard
│   └── strategies/
│       └── jwt.strategy.ts          // Passport JWT strategy
│
├── chat/                            // ChatModule — Pillar 1: Message Storage
│   ├── chat.module.ts
│   ├── chat.gateway.ts              // WebSocket gateway (message:send, typing:*)
│   ├── chat.controller.ts           // REST: GET/POST messages, conversations
│   ├── chat.service.ts              // Write-through logic, broadcast
│   ├── message.repository.ts        // Drizzle queries for messages
│   └── conversation.repository.ts   // Drizzle queries for conversations
│
├── receipt/                         // ReceiptModule — Pillar 2: Read Receipts
│   ├── receipt.module.ts
│   ├── receipt.gateway.ts           // WebSocket: receipt:read events
│   ├── receipt.service.ts           // Hybrid logic: direct write (1:1) vs Redis counter (group)
│   ├── receipt.repository.ts        // Drizzle queries for read_receipts table
│   ├── receipt.worker.ts            // Background job: batch flush Redis → PostgreSQL (every 10s)
│   └── receipt.scheduler.ts         // NestJS @Cron or @Interval for flush trigger
│
├── presence/                        // PresenceModule — Pillar 3: Presence
│   ├── presence.module.ts
│   ├── presence.gateway.ts          // WebSocket: presence:heartbeat
│   ├── presence.service.ts          // Redis SETEX, TTL refresh, status transitions
│   ├── presence.subscriber.ts       // Redis keyspace notifications (TTL expiry → broadcast offline)
│   └── presence.repository.ts       // PostgreSQL: update users.last_seen_at on disconnect
│
├── common/                          // Shared utilities
│   ├── filters/
│   │   └── global-exception.filter.ts   // Consistent ApiError shape
│   ├── interceptors/
│   │   └── response.interceptor.ts      // Wrap responses in ApiResponse<T> envelope
│   ├── pipes/
│   │   └── validation.pipe.ts           // class-validator integration
│   ├── decorators/
│   │   └── current-user.decorator.ts    // Extract user from JWT
│   └── constants/
│       ├── error-codes.ts               // Error code catalog
│       ├── rate-limits.ts               // Rate limit configuration
│       └── ws-events.ts                 // Event name constants (namespace:action)
│
├── redis/                           // RedisModule
│   ├── redis.module.ts
│   ├── redis.service.ts             // Connection, pub/sub, key operations
│   └── redis.health.ts              // Health check: PING
│
├── database/                        // DatabaseModule
│   ├── database.module.ts
│   ├── drizzle.config.ts            // Drizzle connection + pool config
│   ├── schema/                      // Drizzle schema definitions
│   │   ├── users.ts
│   │   ├── conversations.ts
│   │   ├── conversation-participants.ts
│   │   ├── messages.ts
│   │   └── read-receipts.ts
│   └── migrations/                  // Drizzle Kit migrations
│
└── health/                          // HealthModule
    ├── health.module.ts
    └── health.controller.ts         // GET /health/live, /health/ready
```

### 4.2 Service Layer

Each service owns one domain concern. No cross-service direct calls — communicate through NestJS dependency injection.

| Service | Owns | Depends On |
|---------|------|------------|
| `AuthService` | JWT lifecycle, password hashing, token rotation | DatabaseModule |
| `ChatService` | Write-through message persistence, broadcast to recipients | DatabaseModule, RedisModule (pub/sub for multi-server) |
| `ReceiptService` | Read receipt logic: direct write (1:1), Redis INCR (group), batch flush | DatabaseModule, RedisModule |
| `PresenceService` | Heartbeat processing, TTL management, status transitions | RedisModule, DatabaseModule (last_seen_at) |
| `RedisService` | Connection management, pub/sub, key operations | — |

**Cross-server broadcast** (from scalability section):
When running multiple WS server instances behind a load balancer, `ChatService` publishes messages to Redis Pub/Sub channels. All server instances subscribe and forward to their connected clients.

```
Channel naming:
  chat:conversation:{conversationId}   → message events
  chat:presence:{userId}               → presence changes
  chat:typing:{conversationId}         → typing indicators
```

### 4.3 Gateway Architecture

NestJS WebSocket gateways handle real-time events. One gateway per domain.

```typescript
// Gateway responsibilities:

@WebSocketGateway()
ChatGateway
  ├── handleConnection()        // Authenticate, register socket
  ├── handleDisconnect()        // Cleanup subscriptions
  ├── @SubscribeMessage('auth')
  ├── @SubscribeMessage('subscribe')
  ├── @SubscribeMessage('unsubscribe')
  ├── @SubscribeMessage('message:send')
  ├── @SubscribeMessage('typing:start')
  └── @SubscribeMessage('typing:stop')

@WebSocketGateway()
ReceiptGateway
  └── @SubscribeMessage('receipt:read')

@WebSocketGateway()
PresenceGateway
  └── @SubscribeMessage('presence:heartbeat')
```

**Connection lifecycle:**
1. Client connects with JWT in query param: `ws://host/chat?token=<JWT>`
2. `ws-auth.guard.ts` validates token, attaches `userId` to socket
3. `handleConnection()` registers socket in in-memory map: `Map<userId, Socket[]>` (supports multi-device)
4. Client sends `subscribe` with `conversationId` → socket joins room
5. Heartbeat every 15s refreshes presence TTL
6. On disconnect: remove from socket map, wait grace period (5s), then mark offline if no other sockets

### 4.4 Data Flow: Write-Through Lifecycle

This is the critical path that solves the Three-Second Problem. Every message follows this synchronous flow — no write-behind.

```
Client                   Gateway              ChatService           PostgreSQL        Redis Pub/Sub       Other Clients
  │                        │                      │                     │                  │                   │
  │── message:send ───────▶│                      │                     │                  │                   │
  │   {conversationId,     │                      │                     │                  │                   │
  │    content,            │── validate ──────────▶│                     │                  │                   │
  │    clientMessageId}    │   (auth, rate limit,  │                     │                  │                   │
  │                        │    content length)    │                     │                  │                   │
  │                        │                      │── INSERT message ──▶│                  │                   │
  │                        │                      │   (within tx)       │                  │                   │
  │                        │                      │◀── success ─────────│                  │                   │
  │                        │                      │                     │                  │                   │
  │                        │                      │── PUBLISH ─────────────────────────────▶│                   │
  │                        │                      │   chat:conversation:{id}               │                   │
  │                        │                      │                     │                  │── message:received▶│
  │                        │                      │                     │                  │                   │
  │◀── message:sent ───────│◀─────────────────────│                     │                  │                   │
  │   {clientMessageId,    │                      │                     │                  │                   │
  │    messageId,          │                      │                     │                  │                   │
  │    status: delivered}  │                      │                     │                  │                   │
  │                        │                      │                     │                  │                   │
```

**Latency targets (from task.md):**

| Metric | Target | Measured from |
|--------|--------|---------------|
| p50 | < 100ms | `message:send` → `message:sent` |
| p95 | < 500ms | `message:send` → `message:sent` |
| p99 | < 1000ms | `message:send` → `message:sent` |

**Failure handling at each step:**

| Step | Failure | Handling |
|------|---------|----------|
| Validation | Content empty/too long | Return `message:error` with `VALIDATION_ERROR`, no DB write |
| Rate limit | 30+ msgs/min | Return `message:error` with `RATE_LIMITED`, include `retryAfter` |
| DB INSERT | Connection timeout | Retry 3x with 100ms/200ms/400ms backoff. If all fail: return `message:error` with `DB_ERROR`, `retryable: true` |
| DB INSERT | Duplicate `clientMessageId` | Return `message:sent` with existing `messageId` (idempotent, not an error) |
| Redis PUBLISH | Redis unavailable | Message already persisted in DB. Log warning. Recipients on other servers get message on next REST fetch or reconnect. Non-critical. |
| WebSocket broadcast | Client disconnected | Message persisted. Client gets it on reconnect via REST history fetch. |

---

## Appendix: Design Token → Three Pillars Mapping

| Three-Second Question | Frontend Tokens Used | Backend Events |
|-----------------------|---------------------|----------------|
| "Did it save?" | `--color-tick-sending` → `--color-tick-delivered`, MessageStatus state machine | `message:send` → DB INSERT → `message:sent` |
| "Who saw it?" | `--color-tick-read`, ReadReceiptDisplay (ticks or count) | `receipt:read` → Redis INCR or DB write → `receipt:updated` / `receipt:count` |
| "Who's online?" | `--color-status-online/away/offline`, PresenceIndicator dot | `presence:heartbeat` → Redis SETEX → `presence:update` |
