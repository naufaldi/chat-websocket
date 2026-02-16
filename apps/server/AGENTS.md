# AGENTS.md - Backend Developer Guide

> See root `AGENTS.md` for monorepo overview and superpowers skills.

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

## DTOs with class-validator

```typescript
// ✅ Good: DTO with validation
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

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

## Error Handling

```typescript
// ✅ Good: Use NestJS exceptions
throw new BadRequestException('Invalid email');
throw new UnauthorizedException('Invalid credentials');
throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');

// Custom exception
@Injectable()
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: SwitchToWs) {
    const client = host.getClient();
    client.emit('error', { message: 'Something went wrong' });
  }
}
```

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
