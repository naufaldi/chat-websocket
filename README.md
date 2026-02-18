# Chat WebSocket

Real-time chat application built in a Bun + Turborepo monorepo with:

- `apps/server`: NestJS REST + Socket.IO backend
- `apps/web`: React + Vite frontend
- `packages/shared`: shared Zod schemas/types
- `packages/db`: Drizzle schema and migrations

## Tech Stack

- Bun 1.3.x
- Turborepo
- NestJS 11
- React 19 + Vite 7
- Socket.IO
- PostgreSQL + Drizzle ORM
- Redis (adapter/presence)

## Prerequisites

- Bun installed
- PostgreSQL running
- Redis running

## Environment Setup

Create env files from examples:

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Important defaults:

- API: `http://localhost:3000`
- Web: `http://localhost:5173`
- WebSocket namespace: `/chat`
- DB: `postgresql://chat:chat_password@localhost:5432/chat_db`

## Install

```bash
bun install
```

## Database Setup

Run migrations from the DB package:

```bash
cd packages/db
bun run migrate
```

## Run the App

From project root:

```bash
bun run dev
```

This starts both web and server via Turbo.

## Demo Seed Data

This project includes demo seed data for local testing:

```bash
cd apps/server
bun run seed:demo
```

The seed creates:

- 3 users (`person_a_demo`, `person_b_demo`, `person_ref_demo`)
- 2 conversations (including an old reference chat)
- 5 historical messages

### Seeded Login Accounts

All seeded users share the same password:

- Password: `DemoPass123`

Emails:

- `person-a.demo@chat.local`
- `person-b.demo@chat.local`
- `person-ref.demo@chat.local`

## Why You May See "No users found"

Contact search in **New Chat** uses server-side search and has constraints:

- You must type at least **3 characters**
- Search matches seeded `username`/`displayName` (try `person` or `demo`)
- Current user is excluded from search results

If you log in with a non-seeded account, you may not see the seeded conversations in sidebar.

## Useful Commands

At repo root:

```bash
bun run dev
bun run build
bun run typecheck
bun run lint
bun run test
```

Per app:

```bash
cd apps/server && bun run dev
cd apps/server && bun run typecheck
cd apps/server && bun run test

cd apps/web && bun run dev
cd apps/web && bun run typecheck
cd apps/web && bun run test
```

## API Docs

When server is running:

- Swagger UI: `http://localhost:3000/api/docs`

## Current Notes

- Message history is loaded when opening a conversation via `GET /api/conversations/:id/messages`.
- Realtime messaging continues through Socket.IO events.
