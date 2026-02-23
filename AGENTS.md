# AGENTS.md - Developer Guide for chat-websocket

> **IMPORTANT**: Each subfolder has its own AGENTS.md with specific guidelines.
> - [Frontend](./apps/web/AGENTS.md) - React, Vite, Tailwind
> - [Backend](./apps/server/AGENTS.md) - NestJS, WebSocket, Drizzle
> - [Database Schema](./packages/db/AGENTS.md) - Drizzle ORM, migrations

## Overview

This is a **Bun + Turborepo monorepo** with NestJS backend and Vite/React frontend.

**Tech Stack:** Bun 1.3.4, NestJS 11.x, Drizzle ORM, PostgreSQL, Socket.io, Vite 7.x, React 19.x, TanStack Query 5.x, Tailwind CSS 4.x, Turborepo 2.x

---

## Superpowers Skills (MUST USE)

**CRITICAL**: Before ANY task, check available skills using `Skill` tool. Even 1% chance a skill applies = use it.

### Priority Order:

| Skill | When to Use |
|-------|-------------|
| `brainstorming` | Before creative/feature work |
| `writing-plans` | Before implementation (create plan first) |
| `test-driven-development` | Before writing implementation code |
| `subagent-driven-development` | For executing plans with subagents |
| `verification-before-completion` | Before claiming work is done |
| `requesting-code-review` | When completing major features |
| `finishing-a-development-branch` | When wrapping up development |

### Domain-Specific Skills:
- Frontend: `vercel-react-best-practices`, `frontend-design`
- Backend: `backend-dev-guidelines`
- Testing: `frontend-testing`
- Debugging: `systematic-debugging`

---

## Build / Lint / Test Commands

### Root Commands (Monorepo)

```bash
bun run build      # Build all packages
bun run dev        # Development (all packages)
bun run typecheck  # Type check all packages
bun run lint       # Lint all packages
bun run test       # Test all packages
```

### Server (NestJS)

```bash
cd apps/server
bun run build      # Build
bun run dev        # Development with hot reload
bun run start      # Start production
bun run typecheck  # Type check
bun run lint       # Lint
```

### Web (Vite + React)

```bash
cd apps/web
bun run dev        # Development server
bun run build      # Production build
bun run preview    # Preview production build
bun run typecheck  # Type check
bun run lint       # Lint
```

### Single Test

> ⚠️ **TODO**: Add Jest/Vitest configuration.
> ```bash
> bun run test -- path/to/test.spec.ts
> ```

---

## Bun-Specific Code Style

```bash
# ✅ Good: Use bun instead of npm
bun install
bun add package-name
bun remove package-name

# ✅ Good: Use bunx instead of npx
bunx drizzle-kit generate
bunx nest g resource users
bunx vite

# ✅ Good: Run scripts with bun
bun run dev
bun run build
```

---

## Code Style Guidelines

### General

- **Language**: TypeScript everywhere (no plain JavaScript)
- **ES Target**: ES2022 (frontend), ES2021 (backend)
- **Module System**: ESM (frontend), CommonJS (backend via NestJS)
- **Strict Mode**: Enabled globally

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `auth.service.ts`, `message-list.tsx` |
| Classes | PascalCase | `AuthService`, `ChatGateway` |
| Interfaces | PascalCase | `User`, `MessagePayload` |
| Types | PascalCase | `MessageStatus` |
| Constants | SCREAMING_SNAKE | `MAX_MESSAGE_LENGTH` |
| Variables | camelCase | `userId`, `conversationList` |
| Enums | PascalCase (members too) | `MessageStatus.Sending` |

### Imports

Order: external → internal → relative
- External: `import { z } from 'zod'`
- Internal: `import { DRIZZLE } from '@/database'`
- Relative: `import { AuthService } from './auth.service'`

### NestJS (Backend)

- Use constructor injection with `@Inject`
- Use DTOs with class-validator
- Use repository pattern for database access

### React (Frontend)

- Use functional components with explicit props
- Use TanStack Query for data fetching
- Use `cn()` helper for conditional Tailwind classes

### Error Handling

- Backend: Use NestJS exceptions (`BadRequestException`, `UnauthorizedException`, etc.)
- Frontend: Handle errors gracefully with try/catch

### Database (Drizzle)

- Use Drizzle operators (`eq`, `desc`, `and`, `isNull`)
- Use repository pattern
- Avoid raw SQL unless necessary

---

## Functional Programming Principles (MUST FOLLOW)

**All code must follow functional programming principles. Never use imperative patterns when declarative alternatives exist.**

### Core Principles

| Principle | Imperative (Avoid) | Functional (Use) |
|-----------|-------------------|-------------------|
| **Validation** | Manual if-else chains | Zod schema-first |
| **Data Transform** | `for` loops with mutations | `map`, `filter`, `reduce`, `flatMap` |
| **State Changes** | Mutable variables, reassignments | Immutable updates, spread operators |
| **Error Handling** | `throw` / `try-catch` | Result types, `safeParse`, early returns |
| **Conditionals** | Deep if-else nesting | Ternary operators, pattern matching |
| **Async Flow** | Sequential `await` in loops | `Promise.all`, `Promise.allSettled` |

### Enforcement

**Review Checklist for All Code:**
- [ ] No manual validation with if-else chains (use Zod)
- [ ] No `for` loops with mutations (use array methods)
- [ ] No throwing for expected errors (use Result types)
- [ ] No reassignment of variables (use const + spread)
- [ ] No deep nesting (use early returns, composition)
- [ ] All functions are pure unless explicitly at system boundary

### Git Commits

Format: `<type>(<scope>): <description>`
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## Project Structure

```
chat-websocket/
├── apps/
│   ├── server/          # NestJS backend
│   │   └── src/
│   │       ├── auth/    # Authentication module
│   │       ├── chat/    # Chat/WebSocket module
│   │       └── database/
│   └── web/            # Vite + React frontend
│       └── src/
│           ├── components/
│           ├── hooks/
│           ├── lib/
│           └── pages/
├── packages/
│   └── db/             # Drizzle ORM schema
│       └── src/
│           └── schema/
└── docs/               # RFC and task documentation
```

---

## Important Notes

1. **Always verify versions** against RFC docs before adding dependencies
2. **Use Zod** for runtime validation (both frontend/backend)
3. **WebSocket events** follow `event:action` naming (e.g., `message:send`, `typing:start`)
4. **Database writes** use write-through pattern (confirm only after DB persist)
5. **Environment variables** are documented in `.env.example` files

---

## RFC Documents

Key design decisions are documented in `docs/`:
- `docs/rfc.md` - Tech stack and architecture overview
- `docs/rfc-database-schema.md` - Database schema with Drizzle
- `docs/rfc-websocket-protocol.md` - WebSocket events and flow
- `docs/rfc-rest-api.md` - REST API specification
