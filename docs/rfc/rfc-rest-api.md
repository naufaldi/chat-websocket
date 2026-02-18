# RFC: REST API Specification

> **Task ID:** DOC-003  
> **MVP:** Phase 1 (Basic Chat + Message Storage)  
> **Status:** Draft  
> **Base URL:** `/api/v1`  
> **Content-Type:** `application/json`

---

## Table of Contents

- [1. API Overview](#1-api-overview)
- [2. Authentication](#2-authentication)
- [3. Endpoints](#3-endpoints)
- [4. Request/Response Schemas](#4-requestresponse-schemas)
- [5. Error Handling](#5-error-handling)
- [6. Pagination](#6-pagination)
- [7. Rate Limiting](#7-rate-limiting)
- [8. Implementation Examples](#8-implementation-examples)

---

## 1. API Overview

### 1.1 Architecture

```mermaid
flowchart TB
    subgraph Client["Client Applications"]
        Web[Web App - Vite/React]
        Mobile[Mobile App - Future]
    end

    subgraph API["REST API Layer"]
        Auth[Auth Controller
        /auth/*]
        Conv[Conversation Controller
        /conversations/*]
        User[User Controller
        /users/*]
        Health[Health Controller
        /health/*]
    end

    subgraph Services["Service Layer"]
        AS[Auth Service]
        CS[Conversation Service]
        MS[Message Service]
        US[User Service]
    end

    subgraph Data["Data Layer"]
        DB[(PostgreSQL)]
        Cache[(Redis)]
    end

    Web --> Auth
    Web --> Conv
    Web --> User
    Mobile --> Auth
    Mobile --> Conv

    Auth --> AS
    Conv --> CS
    Conv --> MS
    User --> US

    AS --> DB
    CS --> DB
    MS --> DB
    US --> DB
    AS --> Cache
```

### 1.2 API Standards

| Standard | Value | Description |
|----------|-------|-------------|
| **Base URL** | `/api/v1` | Versioned API path |
| **Protocol** | HTTPS | TLS 1.2+ required in production |
| **Encoding** | UTF-8 | All requests/responses |
| **Date Format** | ISO 8601 | `2024-01-15T10:30:00.000Z` |
| **ID Format** | UUID v4 | `usr_abc123`, `conv_xyz789` |
| **Pagination** | Cursor-based | O(1) performance at scale |

---

## 2. Authentication

### 2.1 Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as PostgreSQL
    participant Redis as Redis

    Note over C,Redis: Registration
    C->>API: POST /auth/register
    API->>API: Validate input (Zod)
    API->>API: Hash password (Argon2id)
    API->>DB: INSERT user
    DB-->>API: User created
    API->>API: Generate JWT pair
    API->>Redis: Store refresh token
    API-->>C: {accessToken, refreshToken, user}

    Note over C,Redis: Login
    C->>API: POST /auth/login
    API->>DB: SELECT user by email
    DB-->>API: User data
    API->>API: Verify password
    API->>API: Generate JWT pair
    API->>Redis: Store refresh token
    API-->>C: {accessToken, refreshToken, user}

    Note over C,Redis: Authenticated Request
    C->>API: GET /conversations
    Note right of C: Authorization: Bearer {accessToken}
    API->>API: Verify JWT
    API->>DB: Fetch conversations
    DB-->>API: Data
    API-->>C: {data, meta}

    Note over C,Redis: Token Refresh
    C->>API: POST /auth/refresh
    Note right of C: Cookie: refreshToken=xxx
    API->>Redis: Validate refresh token
    Redis-->>API: Valid
    API->>Redis: Rotate token (delete old, create new)
    API-->>C: {accessToken, refreshToken}
```

### 2.2 JWT Token Structure

**Access Token** (15-minute expiry):
```json
{
  "sub": "usr_abc123",
  "email": "user@example.com",
  "username": "johndoe",
  "iat": 1705312800,
  "exp": 1705313700,
  "type": "access"
}
```

**Refresh Token** (7-day expiry):
```json
{
  "sub": "usr_abc123",
  "jti": "refresh_uuid_456",
  "iat": 1705312800,
  "exp": 1705917600,
  "type": "refresh"
}
```

### 2.3 Authentication Headers

```http
# Standard authenticated request
GET /api/v1/conversations HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-ID: req_uuid_789
```

---

## 3. Endpoints

### 3.1 Authentication Endpoints

#### POST `/auth/register`
Register a new user account.

**Request:**
```typescript
interface RegisterRequest {
  email: string;        // Valid email, unique
  username: string;     // 3-50 chars, alphanumeric + underscore
  password: string;     // 8-100 chars, complexity requirements
  displayName: string;  // 1-100 chars
}
```

**Response (201 Created):**
```typescript
interface RegisterResponse {
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      createdAt: string;
    };
    accessToken: string;   // 15-min JWT
    refreshToken: string;  // 7-day JWT
  };
}
```

**Errors:**
- `400` - Validation error (invalid email, weak password)
- `409` - Email or username already exists
- `429` - Rate limited (5 attempts per 15 min)

---

#### POST `/auth/login`
Authenticate existing user.

**Request:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response (200 OK):**
```typescript
interface LoginResponse {
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Rate limited (5 attempts per 15 min)

---

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request:**
- Refresh token sent via HTTP-only cookie
- No body required

**Response (200 OK):**
```typescript
interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;  // New refresh token (rotation)
  };
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

#### POST `/auth/logout`
Logout user and invalidate tokens.

**Request:**
- Access token in Authorization header
- Refresh token in cookie

**Response (200 OK):**
```typescript
interface LogoutResponse {
  data: {
    message: "Logged out successfully";
  };
}
```

**Actions:**
- Blacklist access token (Redis, TTL = token expiry)
- Delete refresh token from Redis
- Clear refresh cookie

---

### 3.2 Conversation Endpoints

#### GET `/conversations`
List user's conversations.

**Query Parameters:**
```typescript
interface ListConversationsQuery {
  cursor?: string;      // Pagination cursor
  limit?: number;       // Default: 20, Max: 100
}
```

**Response (200 OK):**
```typescript
interface ListConversationsResponse {
  data: {
    conversations: Array<{
      id: string;
      type: 'direct' | 'group';
      title: string | null;
      avatarUrl: string | null;
      createdAt: string;
      updatedAt: string;
      participants: Array<{
        user: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        };
        role: 'owner' | 'admin' | 'member';
      }>;
      lastMessage: {
        id: string;
        content: string;
        senderId: string;
        createdAt: string;
      } | null;
      unreadCount: number;
    }>;
    meta: {
      cursor: string | null;
      hasMore: boolean;
    };
  };
}
```

---

#### POST `/conversations`
Create a new conversation.

**Request:**
```typescript
interface CreateConversationRequest {
  type: 'direct' | 'group';
  title?: string;           // Required for group
  participantIds: string[]; // User IDs to add (must include self for group)
}
```

**Response (201 Created):**
```typescript
interface CreateConversationResponse {
  data: {
    id: string;
    type: 'direct' | 'group';
    title: string | null;
    createdAt: string;
    participants: Array<{
      user: {
        id: string;
        username: string;
        displayName: string;
      };
      role: 'owner' | 'admin' | 'member';
    }>;
  };
}
```

**Errors:**
- `400` - Invalid participants (non-existent users)
- `409` - Direct conversation already exists with user

---

#### GET `/conversations/:id`
Get conversation details.

**Response (200 OK):**
```typescript
interface GetConversationResponse {
  data: {
    id: string;
    type: 'direct' | 'group';
    title: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: {
      id: string;
      username: string;
    };
    participants: Array<{
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        lastSeenAt: string | null;
      };
      role: 'owner' | 'admin' | 'member';
      joinedAt: string;
    }>;
  };
}
```

**Errors:**
- `403` - User not a participant
- `404` - Conversation not found

---

### 3.3 Message Endpoints

#### GET `/conversations/:id/messages`
Get message history for a conversation.

**Query Parameters:**
```typescript
interface GetMessagesQuery {
  cursor?: string;      // Pagination cursor (opaque)
  limit?: number;       // Default: 50, Max: 100
  before?: string;      // ISO timestamp (alternative to cursor)
}
```

**Response (200 OK):**
```typescript
interface GetMessagesResponse {
  data: {
    messages: Array<{
      id: string;
      conversationId: string;
      sender: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      content: string;
      contentType: 'text' | 'image' | 'file';
      clientMessageId: string;
      replyToId: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    meta: {
      cursor: string | null;  // Opaque cursor for next page
      hasMore: boolean;
    };
  };
}
```

**Notes:**
- Messages sorted by `createdAt DESC` (newest first)
- Includes sender details (no N+1 query)
- Soft-deleted messages excluded

---

#### POST `/conversations/:id/messages`
Send a message (HTTP fallback for WebSocket).

**Request:**
```typescript
interface SendMessageRequest {
  content: string;           // 1-4000 characters
  contentType: 'text';       // MVP 1: text only
  clientMessageId: string;   // UUID v4 for deduplication
  replyToId?: string;        // Optional: message being replied to
}
```

**Response (201 Created):**
```typescript
interface SendMessageResponse {
  data: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    contentType: 'text';
    clientMessageId: string;
    status: 'delivered';
    createdAt: string;
  };
}
```

**Errors:**
- `400` - Validation error (empty content, too long)
- `403` - Not a conversation participant
- `404` - Conversation not found
- `409` - Duplicate clientMessageId (returns existing message)
- `429` - Rate limited (30 messages per minute)

**Note:** Primary method is WebSocket `message:send`. This HTTP endpoint is for:
- Initial page load (before WebSocket connects)
- Retry after WebSocket failure
- Mobile background sync

---

### 3.4 User Endpoints

#### GET `/users/me`
Get current user profile.

**Response (200 OK):**
```typescript
interface GetMeResponse {
  data: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isActive: boolean;
    readReceiptsEnabled: boolean;
    presenceEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

#### GET `/users/search`
Search users by username or display name.

**Query Parameters:**
```typescript
interface SearchUsersQuery {
  q: string;           // Search query (3+ chars)
  limit?: number;      // Default: 20, Max: 50
}
```

**Response (200 OK):**
```typescript
interface SearchUsersResponse {
  data: {
    users: Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    }>;
  };
}
```

**Notes:**
- Excludes current user from results
- Case-insensitive search
- Minimum 3 characters

---

## 4. Request/Response Schemas

### 4.1 Common Response Wrapper

All responses follow this envelope structure:

```typescript
// Success response
interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

// Error response
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    retryable: boolean;
    retryAfter?: number;
    traceId: string;
  };
}
```

### 4.2 Zod Validation Schemas

```typescript
// src/validation/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// src/validation/message.schema.ts
export const sendMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message must be at most 4000 characters'),
  contentType: z.literal('text'),
  clientMessageId: z.string().uuid('Invalid client message ID'),
  replyToId: z.string().uuid().optional(),
});

// src/validation/conversation.schema.ts
export const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  title: z.string().max(100).optional(),
  participantIds: z.array(z.string().uuid())
    .min(1, 'At least one participant required')
    .max(100, 'Maximum 100 participants'),
}).refine(
  (data) => data.type !== 'group' || data.title,
  {
    message: 'Title is required for group conversations',
    path: ['title'],
  }
);
```

---

## 5. Error Handling

### 5.1 HTTP Status Codes

| Status | Code | Description | Retryable |
|--------|------|-------------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid input data | No |
| 401 | `UNAUTHORIZED` | Missing or invalid token | No |
| 403 | `FORBIDDEN` | Insufficient permissions | No |
| 404 | `NOT_FOUND` | Resource doesn't exist | No |
| 409 | `CONFLICT` | Resource already exists | No |
| 429 | `RATE_LIMITED` | Too many requests | Yes |
| 500 | `INTERNAL_ERROR` | Server error | Yes (1x) |
| 503 | `SERVICE_UNAVAILABLE` | Database/Redis down | Yes |

### 5.2 Error Response Examples

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Trace-ID: trace_abc123

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Invalid email address"],
      "password": ["Password must contain at least one uppercase letter"]
    },
    "retryable": false,
    "traceId": "trace_abc123"
  }
}
```

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-Trace-ID: trace_def456

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please slow down.",
    "retryable": true,
    "retryAfter": 30,
    "traceId": "trace_def456"
  }
}
```

---

## 6. Pagination

### 6.1 Cursor-Based Pagination

```mermaid
flowchart LR
    subgraph Request["First Request"]
        R1[GET /messages
        No cursor]
    end

    subgraph Response1["Response"]
        D1[Messages 1-50]
        M1[cursor: "abc123"
        hasMore: true]
    end

    subgraph Request2["Next Request"]
        R2[GET /messages
        cursor: "abc123"]
    end

    subgraph Response2["Response"]
        D2[Messages 51-100]
        M2[cursor: "def456"
        hasMore: true]
    end

    subgraph Last["Last Page"]
        R3[GET /messages
        cursor: "def456"]
        D3[Messages 101-120]
        M3[cursor: null
        hasMore: false]
    end

    R1 --> D1
    D1 --> M1
    M1 --> R2
    R2 --> D2
    D2 --> M2
    M2 --> R3
    R3 --> D3
    D3 --> M3
```

### 6.2 Cursor Encoding

```typescript
// Cursor format: base64(JSON.stringify({createdAt, id}))
interface Cursor {
  createdAt: string;  // ISO timestamp
  id: string;         // Message/Conversation ID
}

// Encode
const cursor = Buffer.from(JSON.stringify({
  createdAt: message.createdAt,
  id: message.id,
})).toString('base64url');

// Decode
const decoded = JSON.parse(
  Buffer.from(cursor, 'base64url').toString()
) as Cursor;
```

### 6.3 Pagination Query

```typescript
// Repository implementation
async function getMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 50
) {
  const query = db
    .select({
      message: messages,
      sender: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(
      eq(messages.conversationId, conversationId),
      isNull(messages.deletedAt)
    ))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit + 1); // +1 to check hasMore

  if (cursor) {
    const decoded = decodeCursor(cursor);
    query.where(and(
      eq(messages.conversationId, conversationId),
      isNull(messages.deletedAt),
      or(
        lt(messages.createdAt, decoded.createdAt),
        and(
          eq(messages.createdAt, decoded.createdAt),
          lt(messages.id, decoded.id)
        )
      )
    ));
  }

  const results = await query;
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;

  return {
    messages: items,
    meta: {
      cursor: hasMore 
        ? encodeCursor(items[items.length - 1].message) 
        : null,
      hasMore,
    },
  };
}
```

---

## 7. Rate Limiting

### 7.1 Rate Limit Headers

All responses include rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1705312800
```

### 7.2 Rate Limit Configuration

| Endpoint | Limit | Window | Burst |
|----------|-------|--------|-------|
| `POST /auth/register` | 5 | 15 min | 2 |
| `POST /auth/login` | 5 | 15 min | 2 |
| `POST /auth/refresh` | 10 | 1 min | 3 |
| `GET /conversations` | 60 | 1 min | 10 |
| `POST /conversations` | 10 | 1 min | 3 |
| `GET /conversations/:id/messages` | 60 | 1 min | 10 |
| `POST /conversations/:id/messages` | 30 | 1 min | 5 |
| `GET /users/search` | 30 | 1 min | 5 |

### 7.3 Implementation

```typescript
// src/common/guards/rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const endpoint = `${request.method}:${request.route.path}`;
    const key = `ratelimit:${userId}:${endpoint}`;

    const config = this.getRateLimitConfig(endpoint);
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, config.windowSeconds);
    }

    if (current > config.limit) {
      const ttl = await this.redis.ttl(key);
      request.res.setHeader('Retry-After', ttl);
      return false;
    }

    request.res.setHeader('X-RateLimit-Limit', config.limit);
    request.res.setHeader('X-RateLimit-Remaining', Math.max(0, config.limit - current));
    request.res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + config.windowSeconds);

    return true;
  }

  private getRateLimitConfig(endpoint: string): { limit: number; windowSeconds: number } {
    const configs: Record<string, { limit: number; windowSeconds: number }> = {
      'POST:/auth/login': { limit: 5, windowSeconds: 900 },
      'POST:/auth/register': { limit: 5, windowSeconds: 900 },
      'POST:/conversations/:id/messages': { limit: 30, windowSeconds: 60 },
    };
    return configs[endpoint] || { limit: 60, windowSeconds: 60 };
  }
}
```

---

## 8. Implementation Examples

### 8.1 NestJS Controller

```typescript
// src/conversations/conversations.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ConversationsService } from './conversations.service';
import { createConversationSchema } from '../validation/conversation.schema';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  @UseGuards(RateLimitGuard)
  async findAll(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationsService.findByUser(
      req.user.id,
      cursor,
      parseInt(limit) || 20,
    );
  }

  @Post()
  @UseGuards(RateLimitGuard)
  async create(
    @Request() req,
    @Body(new ZodValidationPipe(createConversationSchema)) data,
  ) {
    return this.conversationsService.create({
      ...data,
      createdBy: req.user.id,
    });
  }

  @Get(':id')
  @UseGuards(RateLimitGuard)
  async findOne(@Request() req, @Param('id') id: string) {
    return this.conversationsService.findById(id, req.user.id);
  }

  @Get(':id/messages')
  @UseGuards(RateLimitGuard)
  async getMessages(
    @Request() req,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationsService.getMessages(
      id,
      req.user.id,
      cursor,
      parseInt(limit) || 50,
    );
  }
}
```

### 8.2 Zod Validation Pipe

```typescript
// src/common/pipes/zod-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors,
      });
    }
    
    return result.data;
  }
}
```

---

**Related Documents:**
- [RFC Database Schema](rfc-database-schema.md) - Database structure
- [RFC WebSocket Protocol](rfc-websocket-protocol.md) - Real-time events
- [RFC Authentication Flow](rfc-authentication.md) - Detailed auth implementation
- [RFC Message Storage](rfc-message-storage.md) - Write-through architecture
