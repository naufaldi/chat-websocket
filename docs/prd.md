# Chat System PRD

## Problem Statement: The Three-Second Problem

You send a message in a group chat. Within three seconds, you need to know: did it save? Who saw it? Who's actually online right now? That three-second window contains multiple database writes, WebSocket notifications, and presence checks. Miss any piece, and users lose trust in your platform.

## Goals

1. **Durable message storage** — Messages persist and survive server restarts
2. **Accurate read receipt tracking** — Senders know when messages were read; readers sync state on reconnect
3. **Real-time presence management** — Users see who is online and status updates on disconnect

## Success Criteria

- Sub-second message delivery
- Write-through durability (confirm delivery only after DB write)
- VPS-deployable (Node/Bun, PostgreSQL, Redis)

---

## Phase 1: MVP 1 — Basic Chat + Message Storage

**Technical spec:** [RFC-001](rfc.md#rfc-001-phase-1-basic-chat-message-storage)

### User Stories

- **US-1.1:** As a user, I want to send messages in a 1:1 chat so that the recipient sees them in real time
- **US-1.2:** As a user, I want my messages persisted so that they survive server restarts
- **US-1.3:** As a user, I want to see message history when I open a conversation so that I can catch up

### Acceptance Criteria

- Message delivery confirmation after DB write (write-through)
- WebSocket broadcast for real-time delivery
- Basic auth/identity

### Out of Scope

- Read receipts
- Presence (online/offline status)
- Group chat

---

## Phase 2: MVP 2 — Read Receipts

**Technical spec:** [RFC-002](rfc.md#rfc-002-phase-2-read-receipts)

### User Stories

- **US-2.1:** As a sender, I want to see when my message was read so that I know it was received
- **US-2.2:** As a reader, I want my read state to sync when I reconnect so that I don't see flickering unread badges
- **US-2.3:** As a user in a group, I want to see aggregated view counts so that I'm not overwhelmed by 1000 individual receipts

### Acceptance Criteria

- Redis counters for groups
- Batch flush to PostgreSQL (e.g., every 10 seconds)
- last_read_message_id for offline sync

### Out of Scope

- Presence (online/offline status)

---

## Phase 3: MVP 3 — Presence + Full Completion

**Technical spec:** [RFC-003](rfc.md#rfc-003-phase-3-presence-full-completion)

### User Stories

- **US-3.1:** As a user, I want to see who is online so that I know who can respond quickly
- **US-3.2:** As a user, I want my online status to update when I disconnect so that others see me as offline
- **US-3.3:** As a user, I want the full chat experience (messages, receipts, presence) deployable on my VPS

### Acceptance Criteria

- TTL-based presence in Redis
- Heartbeat mechanism
- WebSocket lifecycle handling
- Docker/VPS deployment
