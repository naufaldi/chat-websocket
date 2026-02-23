# AGENTS.md - Frontend Developer Guide

> See root `AGENTS.md` for monorepo overview and superpowers skills.
> **CRITICAL**: All frontend code must follow [Functional Programming Principles](../../AGENTS.md#functional-programming-principles-must-follow)

## Domain Skills

For this frontend codebase, prioritize:
- `vercel-react-best-practices` - React/Next.js performance
- `frontend-design` - UI/UX patterns
- `writing-react-effects` - Effect patterns

## Commands

```bash
# Development
bun run dev

# Production build
bun run build

# Preview build
bun run preview

# Type check
bun run typecheck

# Lint
bun run lint

# Bun-specific
bunx vite
bunx tailwindcss
```

## Tech Stack

- **Framework**: React 19.x + Vite 7.x
- **Styling**: Tailwind CSS 4.x (CSS-based config)
- **Data Fetching**: TanStack Query 5.x
- **Routing**: React Router DOM 7.x
- **WebSocket**: socket.io-client 4.x
- **Validation**: Zod 4.x

## Path Alias

```json
{
  "@/*": ["./src/*"]
}
```

Import using: `import { Button } from '@/components/Button';`

## Code Style

### Components

- Functional components only (no class components)
- Props interfaces explicit and readonly
- Render is pure function of props and state
- Use `useMemo` for expensive computations
- Compose small, single-responsibility components

### TanStack Query

- Encapsulate data logic in custom hooks
- Use `select` for data transformations
- Immutable optimistic updates with spread operator
- Rollback on error with context
- Invalidate queries after mutations

### WebSocket

- Centralized socket instance in `lib/socket.ts`
- Reconnection enabled by default
- Auth token via `localStorage`

### Tailwind CSS 4.x

- Use `@import "tailwindcss"` in CSS
- Use `cn()` helper for conditional classes

### React State

- Immutable updates only (`[...prev, item]`)
- Use `useReducer` for complex state logic
- No direct mutations in state setters
- Use `useMemo` for derived state

### Forms

- Zod schemas with React Hook Form
- `zodResolver` for validation
- Infer form types from schemas

### Zod Validation

- Define schemas in `packages/shared`
- Infer TypeScript types from schemas
- Parse unknown data at system boundaries with `safeParse`

### Custom Hooks

- Encapsulate side effects (localStorage, sockets)
- Return pure interfaces
- Compose other hooks
- Isolate impure operations

## File Structure

```
apps/web/src/
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utilities (api, socket, utils)
├── pages/          # Route pages
├── types/           # TypeScript types
└── App.tsx         # Root component
```
