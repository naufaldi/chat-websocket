import { Inject, Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { userContacts } from '@chat/db';
import { DRIZZLE } from '../database/database.service';
import type { DrizzleDB } from '../database/database.types';

@Injectable()
export class FriendsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async areContacts(userId: string, requesterId: string): Promise<boolean> {
    const contacts = await this.db
      .select({ id: userContacts.id })
      .from(userContacts)
      .where(
        and(
          eq(userContacts.status, 'accepted'),
          or(
            and(eq(userContacts.requesterId, userId), eq(userContacts.addresseeId, requesterId)),
            and(eq(userContacts.requesterId, requesterId), eq(userContacts.addresseeId, userId)),
          ),
        ),
      )
      .limit(1);

    return contacts.length > 0;
  }
}
