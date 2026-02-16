# AGENTS.md - Shared Package Guide

> **Package:** `@chat/shared`  
> **Purpose:** Single source of truth for types and validation schemas shared between frontend and backend

## Overview

This package contains **Zod schemas** that define the data structures used across the entire application. Both frontend and backend import from here to ensure type safety and validation consistency.

## Why Use Shared Schemas?

1. **Single Source of Truth** - One schema defines validation for both FE and BE
2. **Type Safety** - TypeScript types are automatically generated from Zod schemas
3. **Runtime Validation** - Zod validates data at runtime, not just compile time
4. **No Duplication** - Changes in one place propagate to both frontend and backend

## Usage

### Backend (NestJS)

```typescript
// In DTOs - use for validation
import { registerSchema, type RegisterInput } from '@chat/shared';

// In Services - use types
import type { UserResponse, AuthResponse } from '@chat/shared';
```

### Frontend (React)

```typescript
// In Forms - use for validation with react-hook-form
import { registerSchema, type RegisterInput } from '@chat/shared';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<RegisterInput>({
  resolver: zodResolver(registerSchema),
});

// In API calls - use types
import type { AuthResponse, UserResponse } from '@chat/shared';
```

## Available Schemas

### Auth (`schemas/auth.ts`)

**Schemas:**
- `registerSchema` - User registration validation
- `loginSchema` - Login validation  
- `refreshTokenSchema` - Token refresh validation
- `userResponseSchema` - User data from API
- `authResponseSchema` - Login/register response

**Types:**
- `RegisterInput` - Registration form data
- `LoginInput` - Login form data
- `RefreshTokenInput` - Token refresh data
- `UserResponse` - User data (createdAt as string)
- `AuthResponse` - Auth response with token + user

### User (`schemas/user.ts`)

**Schemas:**
- `userSchema` - Full user entity
- `userPublicSchema` - Public user data (omits sensitive fields)

**Types:**
- `User` - Full user type
- `UserPublic` - Public user type

### Message (`schemas/message.ts`)

**Schemas:**
- `messageSchema` - Message entity
- `sendMessageSchema` - Sending message validation
- `messageStatusSchema` - Message status enum

**Types:**
- `Message` - Message type
- `SendMessageInput` - Send message data
- `MessageStatus` - 'sending' | 'delivered' | 'read' | 'error'

### Conversation (`schemas/conversation.ts`)

**Schemas:**
- `conversationSchema` - Conversation entity
- `conversationParticipantSchema` - Participant entity
- `createConversationSchema` - Create conversation validation
- `conversationTypeSchema` - 'direct' | 'group' enum

**Types:**
- `Conversation` - Conversation type
- `ConversationParticipant` - Participant type
- `CreateConversationInput` - Create conversation data
- `ConversationType` - 'direct' | 'group'

## Best Practices

### 1. Always Use Shared Types

```typescript
// ✅ GOOD - Use shared types
import type { UserResponse } from '@chat/shared';

async function getUser(): Promise<UserResponse> {
  // ...
}

// ❌ BAD - Don't duplicate types
interface UserResponse {  // Don't do this!
  id: string;
  email: string;
  // ...
}
```

### 2. Use Zod for Form Validation

```typescript
// ✅ GOOD - Use shared schema for validation
import { registerSchema, type RegisterInput } from '@chat/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<RegisterInput>({
  resolver: zodResolver(registerSchema),
});

// ❌ BAD - Don't create separate validation
const validation = {  // Don't do this!
  email: z.string().email(),
  // ...
}
```

### 3. Keep Schemas in Sync

When you need to change a data structure:
1. Update the schema in `@chat/shared`
2. Both FE and BE automatically get the changes
3. TypeScript will show errors where updates are needed

### 4. Use Type Inference

```typescript
// ✅ GOOD - Infer types from schemas
export type RegisterInput = z.infer<typeof registerSchema>;

// ❌ BAD - Don't manually write types
export interface RegisterInput {  // Don't do this!
  email: string;
  // ...
}
```

## Example: Complete Auth Flow

### 1. Define Schema (in `@chat/shared`)

```typescript
// schemas/auth.ts
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  displayName: z.string().min(2),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

### 2. Backend DTO (in `@chat/server`)

```typescript
// dto/register.dto.ts
import { registerSchema, type RegisterInput } from '@chat/shared';

export class RegisterDto implements RegisterInput {
  // NestJS decorators here
}
```

### 3. Frontend Form (in `@chat/web`)

```typescript
// components/RegisterForm.tsx
import { registerSchema, type RegisterInput } from '@chat/shared';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<RegisterInput>({
  resolver: zodResolver(registerSchema),
});
```

## Important Notes

- **Never** duplicate schema definitions
- **Always** import from `@chat/shared`
- **Use** `z.infer<>` for type inference
- **Validate** all API inputs with Zod
- **Sync** types automatically via the shared package

## Adding New Schemas

1. Create schema file in `src/schemas/`
2. Export from `src/index.ts`
3. Import in both FE and BE
4. Use for validation and types
