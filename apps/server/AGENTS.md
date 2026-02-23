# AGENTS.md - Backend Developer Guide

> See root `AGENTS.md` for monorepo overview and superpowers skills.
> **CRITICAL**: All backend code must follow [Functional Programming Principles](../../AGENTS.md#functional-programming-principles-must-follow)

## Domain Skills

For this backend codebase, prioritize:
- `backend-dev-guidelines` - Backend patterns and architecture
- `systematic-debugging` - For debugging issues

## Commands

```bash
# Build
bun run build

# Development with hot reload
bun run dev

# Start production
bun run start

# Type check
bun run typecheck

# Lint
bun run lint

# Bun-specific
bunx nest g resource users
bunx drizzle-kit generate
```

## Tech Stack

- **Framework**: NestJS 11.x
- **WebSocket**: Socket.io via @nestjs/websockets
- **Auth**: @nestjs/jwt + @nestjs/passport
- **Validation**: class-validator, Zod
- **Logging**: Pino
- **Database**: Drizzle ORM (via @chat/db)

## Module Structure

```typescript
// ✅ Good: Feature-based module
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

## Dependency Injection

```typescript
// ✅ Good: Constructor injection with @Inject
@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
}
```

## WebSocket Gateway

```typescript
// ✅ Good: NestJS WebSocket Gateway
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.CLIENT_URL },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const userId = client.data.userId;
    // Handle message
    return { event: 'message:sent', data: { ... } };
  }
}
```

## REST Controllers

```typescript
// ✅ Good: REST controller with DTOs
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(new ValidationPipe()) dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

## DTOs - Zod Schema First (Preferred)

- Use Zod schemas for runtime validation (preferred over class-validator)
- Infer TypeScript types from schemas with `z.infer<typeof schema>`
- Use `nestjs-zod` for ZodValidationPipe integration
- class-validator is legacy support only

## Database (Drizzle)

```typescript
// ✅ Good: Repository pattern with Drizzle
@Injectable()
export class MessageRepository {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findByConversation(conversationId: string, limit = 50) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async create(data: typeof messages.$inferInsert) {
    const [message] = await this.db
      .insert(messages)
      .values(data)
      .returning();
    return message;
  }
}
```

## Backend Functional Patterns

### Service Layer

- Separate pure business logic from side effects
- Validation must use Zod schemas with `safeParse`
- Return `Result<T, E>` types instead of throwing for expected errors
- Side effects (DB, events, logging) at system boundaries only

### Repository Pattern

- Build queries immutably with Drizzle operators
- Compose query chains (where, orderBy, limit)
- Use `Result<T, E>` pattern for findById operations
- Never throw for expected "not found" cases

### Error Handling

- Use Result pattern for expected errors (validation, not found)
- NestJS exceptions (`BadRequestException`, etc.) for HTTP layer only
- WebSocket errors via event emitters, not exceptions

## File Structure

```
apps/server/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   └── guards/
├── chat/
│   ├── chat.module.ts
│   ├── chat.gateway.ts
│   ├── chat.service.ts
│   ├── chat.controller.ts
│   └── dto/
├── database/
│   └── database.module.ts
└── main.ts
```
