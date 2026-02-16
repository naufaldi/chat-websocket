import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import { users } from '@chat/db';
import type { RegisterInput } from '@chat/shared';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || null;
  }

  async findByUsername(username: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  async create(data: RegisterInput & { passwordHash: string }) {
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

  async updateLastSeen(id: string) {
    await this.db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, id));
  }
}
