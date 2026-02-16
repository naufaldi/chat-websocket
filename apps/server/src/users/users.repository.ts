import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/database.service';
import { users } from '@chat/db';
import type { RegisterInput } from '@chat/shared';

// Type inference from Drizzle schema
interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  async create(data: RegisterInput & { passwordHash: string }): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
      })
      .returning();
    return user;
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, id));
  }
}
