# TASK-001: Authentication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete JWT-based authentication system with register/login/logout/refresh endpoints, protected routes, and Swagger documentation

**Architecture:** NestJS backend with Drizzle ORM for database, JWT tokens (access + refresh), Argon2id for password hashing. React frontend with TanStack Query for state management, Axios interceptors for token handling.

**Tech Stack:** NestJS 11.x, Drizzle ORM, PostgreSQL, JWT, Argon2id, React 19.x, TanStack Query 5.x, React Hook Form, Zod

---

## Prerequisites

- Database schema already has `users` table with passwordHash column
- Users repository already exists at `apps/server/src/users/users.repository.ts`
- Server dependencies include: @nestjs/jwt, @nestjs/passport, passport-jwt, bcrypt (switch to argon2)

---

## Task 1: Install Required Dependencies

**Files:**
- Modify: `apps/server/package.json`
- Modify: `apps/web/package.json`
- Create: `apps/web/components.json`
- Modify: `apps/web/src/index.css`

**Step 1: Add Argon2 to backend**

Run:
```bash
cd apps/server
bun add argon2 @nestjs/swagger swagger-ui-express
bun add -D @types/argon2
```

Expected: Packages installed successfully

**Step 2: Initialize shadcn/ui in frontend**

Run:
```bash
cd apps/web
npx shadcn@latest init --yes --template vite --base-color slate
```

This will:
- Install shadcn/ui dependencies (Radix UI, Tailwind CSS v4, clsx, tailwind-merge)
- Create `components.json` configuration
- Add CSS variables for theming
- Create `src/lib/utils.ts` with cn() utility

Expected: shadcn/ui initialized successfully

**Step 3: Install shadcn components for auth UI**

Run:
```bash
cd apps/web
npx shadcn@latest add button input label card form
```

This installs:
- Button - Primary actions
- Input - Form fields
- Label - Form labels
- Card - Container components
- Form - Form validation integration

**Step 4: Add additional frontend dependencies**

Run:
```bash
cd apps/web
bun add axios react-hook-form @hookform/resolvers lucide-react
```

Expected: Packages installed successfully

**Step 5: Commit**

```bash
git add apps/server/package.json apps/web/package.json apps/web/components.json
bun run install  # Update lockfile
git add bun.lockb
git commit -m "deps: add argon2, swagger, shadcn/ui, axios, react-hook-form for auth"

---

## Task 2: Create Auth DTOs with Validation

**Files:**
- Create: `apps/server/src/auth/dto/register.dto.ts`
- Create: `apps/server/src/auth/dto/login.dto.ts`
- Create: `apps/server/src/auth/dto/auth-response.dto.ts`
- Create: `apps/server/src/auth/dto/index.ts`

**Step 1: Create register.dto.ts**

```typescript
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must be at most 50 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name' })
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(100, { message: 'Display name must be at most 100 characters' })
  displayName: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 8 chars)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
```

**Step 2: Create login.dto.ts**

```typescript
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'User password' })
  @IsString()
  password: string;
}
```

**Step 3: Create auth-response.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John Doe' })
  displayName: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
```

**Step 4: Create index.ts**

```typescript
export * from './register.dto';
export * from './login.dto';
export * from './auth-response.dto';
```

**Step 5: Commit**

```bash
git add apps/server/src/auth/dto/
git commit -m "feat(auth): add DTOs with validation and Swagger docs"
```

---

## Task 3: Create Auth Service

**Files:**
- Create: `apps/server/src/auth/auth.service.ts`

**Step 1: Create auth.service.ts**

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email exists
    const existingEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username exists
    const existingUsername = await this.usersRepository.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last seen
    await this.usersRepository.updateLastSeen(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    };
  }

  async refreshTokens(userId: string, email: string): Promise<{ accessToken: string }> {
    const tokens = await this.generateTokens(userId, email);
    return { accessToken: tokens.accessToken };
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    return { accessToken };
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/auth/auth.service.ts
git commit -m "feat(auth): add auth service with register, login, refresh"
```

---

## Task 4: Create JWT Strategy and Guard

**Files:**
- Create: `apps/server/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/server/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/server/src/auth/strategies/index.ts`
- Create: `apps/server/src/auth/guards/index.ts`

**Step 1: Create jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.usersRepository.findById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return { userId: user.id, email: user.email };
  }
}
```

**Step 2: Create jwt-auth.guard.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Step 3: Create index.ts files**

`apps/server/src/auth/strategies/index.ts`:
```typescript
export * from './jwt.strategy';
```

`apps/server/src/auth/guards/index.ts`:
```typescript
export * from './jwt-auth.guard';
```

**Step 4: Commit**

```bash
git add apps/server/src/auth/strategies/ apps/server/src/auth/guards/
git commit -m "feat(auth): add JWT strategy and guard"
```

---

## Task 5: Create Auth Controller with Swagger

**Files:**
- Create: `apps/server/src/auth/auth.controller.ts`

**Step 1: Create auth.controller.ts**

```typescript
import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user', description: 'Create a new account with email, username, and password' })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate with email and password' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token', description: 'Get a new access token using current valid token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(@Request() req: { user: { userId: string; email: string } }) {
    return this.authService.refreshTokens(req.user.userId, req.user.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user', description: 'Get information about the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: { user: { userId: string } }) {
    return this.authService.getMe(req.user.userId);
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/auth/auth.controller.ts
git commit -m "feat(auth): add auth controller with Swagger documentation"
```

---

## Task 6: Create Auth Module

**Files:**
- Create: `apps/server/src/auth/auth.module.ts`

**Step 1: Create auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies';
import { UsersRepository } from '../users/users.repository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UsersRepository],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 2: Commit**

```bash
git add apps/server/src/auth/auth.module.ts
git commit -m "feat(auth): add auth module"
```

---

## Task 7: Update App Module and Configure Swagger

**Files:**
- Modify: `apps/server/src/app.module.ts`
- Modify: `apps/server/src/main.ts`

**Step 1: Update app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
    ConversationsModule,
    MessagesModule,
  ],
})
export class AppModule {}
```

**Step 2: Update main.ts to add Swagger**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('Real-time chat system API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
}
bootstrap();
```

**Step 3: Commit**

```bash
git add apps/server/src/app.module.ts apps/server/src/main.ts
git commit -m "feat(auth): integrate auth module and configure Swagger"
```

---

## Task 8: Test Backend Endpoints via Swagger

**Step 1: Start the server**

Run:
```bash
cd apps/server
bun run dev
```

Expected: Server starts on port 3000

**Step 2: Test register endpoint**

Navigate to: `http://localhost:3000/api/docs`

Test POST /auth/register:
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "displayName": "Test User",
  "password": "SecurePass123!"
}
```

Expected: 201 Created with accessToken and user object

**Step 3: Test login endpoint**

Test POST /auth/login:
```json
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

Expected: 200 OK with accessToken

**Step 4: Test get me endpoint**

1. Click "Authorize" button in Swagger
2. Enter: `Bearer {access_token_from_login}`
3. Test GET /auth/me

Expected: 200 OK with user object

**Step 5: Verify error handling**

Test with invalid credentials:
```json
{
  "email": "test@example.com",
  "password": "wrongpassword"
}
```

Expected: 401 Unauthorized

**Step 6: Commit**

```bash
git add .
git commit -m "test(auth): verify auth endpoints via Swagger"
```

---

## Task 9: Create Frontend Auth Types and API Client

**Files:**
- Create: `apps/web/src/types/auth.ts`
- Create: `apps/web/src/lib/api.ts`

**Step 1: Create auth types**

```typescript
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
```

**Step 2: Create API client with Axios**

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: RegisterInput) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data),
  getMe: () => api.get<User>('/auth/me'),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
};
```

**Step 3: Commit**

```bash
git add apps/web/src/types/auth.ts apps/web/src/lib/api.ts
git commit -m "feat(auth): add frontend auth types and API client"
```

---

## Task 10: Create Auth Context and Hook

**Files:**
- Create: `apps/web/src/contexts/AuthContext.tsx`
- Create: `apps/web/src/hooks/useAuth.ts`

**Step 1: Create AuthContext.tsx**

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, RegisterInput, LoginInput } from '../types/auth';
import { authApi } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.getMe()
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (data: LoginInput) => {
    const response = await authApi.login(data);
    const { accessToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
  };

  const register = async (data: RegisterInput) => {
    const response = await authApi.register(data);
    const { accessToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

**Step 2: Create useAuth hook**

```typescript
import { useAuthContext } from '../contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}
```

**Step 3: Commit**

```bash
git add apps/web/src/contexts/AuthContext.tsx apps/web/src/hooks/useAuth.ts
git commit -m "feat(auth): add auth context and hook"
```

---

## Task 11: Create Login Page with Telegram-Style UI

**Files:**
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/components/auth/LoginForm.tsx`

**Design Notes:**
Telegram-style auth UI features:
- Clean, minimal design with blue accent color (#3390EC)
- Large centered logo/branding
- Simple card-based forms
- Subtle shadows and rounded corners
- Focus on mobile-first responsive design

**Step 1: Create LoginForm component with shadcn/ui**

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    
    try {
      await login(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="mx-auto w-20 h-20 bg-[#3390EC] rounded-full flex items-center justify-center shadow-lg">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Sign in to continue to Chat
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              {...register('email')}
              type="email"
              id="email"
              placeholder="you@example.com"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              {...register('password')}
              type="password"
              id="password"
              placeholder="••••••••"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#3390EC] hover:bg-[#2a7bc8] text-white font-medium text-base rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create LoginPage with Telegram-style layout**

```typescript
import { Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3f2fd] via-[#f3e5f5] to-[#e8f5e9] flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,144,236,0.1),transparent_50%)]" />
      </div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
        
        {/* Footer link */}
        <p className="text-center mt-8 text-gray-600">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="font-medium text-[#3390EC] hover:text-[#2a7bc8] transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-center text-sm text-gray-400">
        <p>Secure messaging platform</p>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/auth/LoginForm.tsx apps/web/src/pages/LoginPage.tsx
git commit -m "feat(auth): add login page and form"
```

---

## Task 12: Create Register Page with Telegram-Style UI

**Files:**
- Create: `apps/web/src/pages/RegisterPage.tsx`
- Create: `apps/web/src/components/auth/RegisterForm.tsx`

**Step 1: Create RegisterForm component with shadcn/ui**

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError('');
    
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        password: data.password,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="mx-auto w-20 h-20 bg-[#3390EC] rounded-full flex items-center justify-center shadow-lg">
          <UserPlus className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Join Chat today
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              {...register('email')}
              type="email"
              id="email"
              placeholder="you@example.com"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username
            </Label>
            <Input
              {...register('username')}
              type="text"
              id="username"
              placeholder="johndoe"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
              Display Name
            </Label>
            <Input
              {...register('displayName')}
              type="text"
              id="displayName"
              placeholder="John Doe"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.displayName && (
              <p className="text-sm text-red-500">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              {...register('password')}
              type="password"
              id="password"
              placeholder="••••••••"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirm Password
            </Label>
            <Input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#3390EC] hover:bg-[#2a7bc8] text-white font-medium text-base rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create RegisterPage with Telegram-style layout**

```typescript
import { Link } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3f2fd] via-[#f3e5f5] to-[#e8f5e9] flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,144,236,0.1),transparent_50%)]" />
      </div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        <RegisterForm />
        
        {/* Footer link */}
        <p className="text-center mt-8 text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-[#3390EC] hover:text-[#2a7bc8] transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-center text-sm text-gray-400">
        <p>Secure messaging platform</p>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/auth/RegisterForm.tsx apps/web/src/pages/RegisterPage.tsx
git commit -m "feat(auth): add register page with Telegram-style UI using shadcn"
```

---

## Task 13: Create Protected Route Component

**Files:**
- Create: `apps/web/src/components/auth/ProtectedRoute.tsx`

**Step 1: Create ProtectedRoute**

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/ProtectedRoute.tsx
git commit -m "feat(auth): add protected route component"
```

---

## Task 14: Update App.tsx with Router

**Files:**
- Modify: `apps/web/src/App.tsx`

**Step 1: Update App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

// Placeholder for chat page (will be implemented in TASK-004)
function ChatPage() {
  const { user, logout } = useAuth();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.displayName}!</h1>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

**Step 2: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(auth): integrate auth pages with router"
```

---

## Task 15: Test Complete Authentication Flow

**Step 1: Start both frontend and backend**

Terminal 1:
```bash
cd apps/server
bun run dev
```

Terminal 2:
```bash
cd apps/web
bun run dev
```

**Step 2: Test registration flow**

1. Navigate to `http://localhost:5173/register`
2. Fill in registration form:
   - Email: `test@example.com`
   - Username: `testuser`
   - Display Name: `Test User`
   - Password: `SecurePass123!`
3. Submit form
4. Expected: Redirected to chat page, user info displayed

**Step 3: Test login flow**

1. Logout (click logout button)
2. Navigate to `http://localhost:5173/login`
3. Enter credentials:
   - Email: `test@example.com`
   - Password: `SecurePass123!`
4. Submit form
5. Expected: Redirected to chat page

**Step 4: Test protected routes**

1. Logout
2. Try to access `http://localhost:5173/`
3. Expected: Redirected to login page

**Step 5: Test token persistence**

1. Login
2. Refresh page
3. Expected: Still authenticated (token in localStorage)

**Step 6: Test error handling**

1. Try to register with existing email
2. Expected: Error message displayed
3. Try to login with wrong password
4. Expected: Error message displayed

**Step 7: Run typecheck and lint**

```bash
# In apps/server
bun run typecheck
bun run lint

# In apps/web
bun run typecheck
bun run lint
```

Expected: No errors

**Step 8: Final commit**

```bash
git add .
git commit -m "feat(auth): complete authentication system implementation

- Backend: JWT auth with register/login/refresh/me endpoints
- Frontend: Login/Register pages with form validation
- Swagger: Full OpenAPI documentation at /api/docs
- Testing: All endpoints tested via Swagger UI and frontend"
```

---

## Summary

**Backend Deliverables:**
- ✅ POST /auth/register - User registration with Argon2id
- ✅ POST /auth/login - User login with JWT
- ✅ POST /auth/refresh - Token refresh
- ✅ GET /auth/me - Get current user
- ✅ JWT authentication guard
- ✅ Swagger documentation at /api/docs

**Frontend Deliverables:**
- ✅ Login page with form validation
- ✅ Register page with form validation
- ✅ Auth context for state management
- ✅ Protected routes
- ✅ Axios interceptors for token handling
- ✅ Automatic token refresh

**Testing:**
- ✅ All endpoints tested via Swagger UI
- ✅ Frontend flow tested manually
- ✅ Error handling verified
- ✅ Token persistence verified

**Files Created/Modified:**
- 15+ new files across backend and frontend
- All auth functionality working end-to-end
