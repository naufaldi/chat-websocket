import { Injectable, Inject } from '@nestjs/common';
import { and, eq, ilike, ne, or } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';
import { users } from '@chat/db';
import type { RegisterInput, UpdateProfileInput, PrivacySettings } from '@chat/shared';

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

interface UserSearchRow {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
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

  async searchPublicUsers(query: string, excludeUserId: string, limit: number): Promise<UserSearchRow[]> {
    return this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          ne(users.id, excludeUserId),
          eq(users.isActive, true),
          or(
            ilike(users.username, `%${query}%`),
            ilike(users.displayName, `%${query}%`)
          )
        )
      )
      .limit(limit);
  }

  /**
   * Update user profile fields.
   * Only updates provided fields (partial update).
   */
  async updateProfile(userId: string, data: UpdateProfileInput): Promise<User | null> {
    // Build update object with only provided fields (immutable approach)
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return user ?? null;
  }

  /**
   * Update user privacy settings.
   */
  async updatePrivacy(userId: string, data: PrivacySettings): Promise<PrivacySettings | null> {
    const [user] = await this.db
      .update(users)
      .set({
        presenceSharing: data.presenceSharing,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        presenceSharing: users.presenceSharing,
      });

    return user ?? null;
  }
}
