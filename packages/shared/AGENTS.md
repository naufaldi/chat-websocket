# AGENTS.md - Shared Package

> **Location:** `packages/shared`  
> **Package:** `@chat/shared`

## Purpose

Centralized Zod schemas and TypeScript types shared between frontend and backend. This package is the **single source of truth** for all data structures.

## Rules

### 1. Schema Definition
- All validation schemas MUST be defined in this package using Zod
- NEVER define schemas in frontend or backend packages
- Use `z.infer<>` to generate TypeScript types from schemas

### 2. Export Pattern
- Export schemas from `src/schemas/*.ts` files
- Export everything from `src/index.ts`
- Use named exports for schemas and types

### 3. Schema Structure
- One file per domain (auth.ts, user.ts, message.ts, conversation.ts)
- Export both the schema and its inferred type
- Use descriptive error messages in Zod validators

### 4. Type Safety
- NEVER manually write TypeScript interfaces that duplicate Zod schemas
- ALWAYS use `z.infer<typeof schemaName>` for types
- Import types from `@chat/shared` in both FE and BE

### 5. Validation Usage
- Backend: Use schemas in DTOs with `class-validator` decorators
- Frontend: Use schemas with `zodResolver` for form validation
- Both: Import types from shared package

### 6. Modifying Schemas
- When updating a schema, update it ONLY in this package
- Changes automatically propagate to both FE and BE
- Run typecheck in both packages after schema changes

## File Structure

```
packages/shared/
├── src/
│   ├── schemas/
│   │   ├── auth.ts          # Auth schemas (register, login, etc.)
│   │   ├── user.ts          # User schemas
│   │   ├── message.ts       # Message schemas
│   │   └── conversation.ts  # Conversation schemas
│   └── index.ts             # Export all schemas
├── package.json
└── AGENTS.md               # This file
```

## Available Schemas

### Auth (`schemas/auth.ts`)
- `registerSchema` → `RegisterInput`
- `loginSchema` → `LoginInput`
- `refreshTokenSchema` → `RefreshTokenInput`
- `userResponseSchema` → `UserResponse`
- `authResponseSchema` → `AuthResponse`

### User (`schemas/user.ts`)
- `userSchema` → `User`
- `userPublicSchema` → `UserPublic`

### Message (`schemas/message.ts`)
- `messageSchema` → `Message`
- `sendMessageSchema` → `SendMessageInput`
- `messageStatusSchema` → `MessageStatus`

### Conversation (`schemas/conversation.ts`)
- `conversationSchema` → `Conversation`
- `createConversationSchema` → `CreateConversationInput`
- `conversationTypeSchema` → `ConversationType`

## Usage

### Backend (NestJS)

```typescript
// In DTO
import { registerSchema, type RegisterInput } from '@chat/shared';

export class RegisterDto implements RegisterInput {
  @ApiProperty()
  @IsEmail()
  email: string;
  // ... other fields from RegisterInput
}

// In Service
import type { UserResponse } from '@chat/shared';

async getUser(): Promise<UserResponse> {
  // implementation
}
```

### Frontend (React)

```typescript
// In Form Component
import { registerSchema, type RegisterInput } from '@chat/shared';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<RegisterInput>({
  resolver: zodResolver(registerSchema),
});

// In API Types
import type { AuthResponse, UserResponse } from '@chat/shared';
```

## Commands

```bash
# Type check shared package
bun run typecheck

# Build (if needed)
bun run build
```

## Common Patterns

### Creating a New Schema

1. Add to appropriate file in `src/schemas/`
2. Export both schema and type
3. Export from `src/index.ts`
4. Import in FE and BE

Example:
```typescript
// src/schemas/feature.ts
import { z } from 'zod';

export const featureSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export type Feature = z.infer<typeof featureSchema>;
```

### Schema with Refinement

```typescript
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number');
```

## Important

- This package has ZERO dependencies on other workspace packages
- Can be imported by any app or package in the monorepo
- Keep schemas pure (no business logic)
- Use string dates for API responses (JSON compatible)
