import * as argon2 from 'argon2';
import { and, eq } from 'drizzle-orm';
import { conversations, conversationParticipants, messages, users } from '@chat/db';
import type { DrizzleDB } from '../database/database.types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@chat/db';

const DEMO_PASSWORD = 'DemoPass123';

const DEMO_IDS = {
  users: {
    personA: '11111111-1111-4111-8111-111111111111',
    personB: '22222222-2222-4222-8222-222222222222',
    reference: '33333333-3333-4333-8333-333333333333',
  },
  conversations: {
    direct: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    reference: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  },
  messages: {
    directOne: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    directTwo: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    referenceOne: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    referenceTwo: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    referenceThree: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
  },
} as const;

type DemoUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

const demoUsers: DemoUser[] = [
  {
    id: DEMO_IDS.users.personA,
    email: 'person-a.demo@chat.local',
    username: 'person_a_demo',
    displayName: 'Person A Demo',
  },
  {
    id: DEMO_IDS.users.personB,
    email: 'person-b.demo@chat.local',
    username: 'person_b_demo',
    displayName: 'Person B Demo',
  },
  {
    id: DEMO_IDS.users.reference,
    email: 'person-ref.demo@chat.local',
    username: 'person_ref_demo',
    displayName: 'Reference Demo',
  },
];

async function ensureUser(db: DrizzleDB, input: DemoUser, passwordHash: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return existing.id;
  }

  await db.insert(users).values({
    id: input.id,
    email: input.email,
    username: input.username,
    displayName: input.displayName,
    passwordHash,
    isActive: true,
  });

  return input.id;
}

async function ensureConversation(
  db: DrizzleDB,
  data: {
    id: string;
    type: 'direct' | 'group';
    title: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }
) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, data.id))
    .limit(1);

  if (existing) {
    await db
      .update(conversations)
      .set({
        type: data.type,
        title: data.title,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deletedAt: null,
      })
      .where(eq(conversations.id, data.id));
    return;
  }

  await db.insert(conversations).values({
    id: data.id,
    type: data.type,
    title: data.title,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: null,
  });
}

async function ensureParticipant(db: DrizzleDB, conversationId: string, userId: string, role: 'owner' | 'member') {
  const [existing] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(conversationParticipants)
      .set({
        role,
        isActive: true,
      })
      .where(eq(conversationParticipants.id, existing.id));
    return;
  }

  await db.insert(conversationParticipants).values({
    conversationId,
    userId,
    role,
    isActive: true,
  });
}

async function ensureMessage(
  db: DrizzleDB,
  data: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: Date;
  }
) {
  const [existing] = await db.select().from(messages).where(eq(messages.id, data.id)).limit(1);
  if (existing) {
    return;
  }

  await db.insert(messages).values({
    id: data.id,
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: data.content,
    contentType: 'text',
    status: 'delivered',
    createdAt: data.createdAt,
    updatedAt: data.createdAt,
    deletedAt: null,
  });
}

async function seedDemoData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema }) as DrizzleDB;

  try {
    const passwordHash = await argon2.hash(DEMO_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    for (const user of demoUsers) {
      await ensureUser(db, user, passwordHash);
    }

    const directCreatedAt = new Date('2026-01-14T09:00:00.000Z');
    const directUpdatedAt = new Date('2026-01-14T09:30:00.000Z');
    const referenceCreatedAt = new Date('2025-12-21T08:00:00.000Z');
    const referenceUpdatedAt = new Date('2025-12-21T09:15:00.000Z');

    await ensureConversation(db, {
      id: DEMO_IDS.conversations.direct,
      type: 'direct',
      title: null,
      createdBy: DEMO_IDS.users.personA,
      createdAt: directCreatedAt,
      updatedAt: directUpdatedAt,
    });

    await ensureConversation(db, {
      id: DEMO_IDS.conversations.reference,
      type: 'group',
      title: 'Old Chat Reference',
      createdBy: DEMO_IDS.users.personA,
      createdAt: referenceCreatedAt,
      updatedAt: referenceUpdatedAt,
    });

    await ensureParticipant(db, DEMO_IDS.conversations.direct, DEMO_IDS.users.personA, 'owner');
    await ensureParticipant(db, DEMO_IDS.conversations.direct, DEMO_IDS.users.personB, 'member');

    await ensureParticipant(db, DEMO_IDS.conversations.reference, DEMO_IDS.users.personA, 'owner');
    await ensureParticipant(db, DEMO_IDS.conversations.reference, DEMO_IDS.users.personB, 'member');
    await ensureParticipant(db, DEMO_IDS.conversations.reference, DEMO_IDS.users.reference, 'member');

    await ensureMessage(db, {
      id: DEMO_IDS.messages.directOne,
      conversationId: DEMO_IDS.conversations.direct,
      senderId: DEMO_IDS.users.personA,
      content: 'Hi Person B, this direct chat is pre-seeded for demo.',
      createdAt: new Date('2026-01-14T09:05:00.000Z'),
    });

    await ensureMessage(db, {
      id: DEMO_IDS.messages.directTwo,
      conversationId: DEMO_IDS.conversations.direct,
      senderId: DEMO_IDS.users.personB,
      content: 'Great, now contacts and messages should be visible immediately.',
      createdAt: new Date('2026-01-14T09:30:00.000Z'),
    });

    await ensureMessage(db, {
      id: DEMO_IDS.messages.referenceOne,
      conversationId: DEMO_IDS.conversations.reference,
      senderId: DEMO_IDS.users.reference,
      content: 'This is the historical reference chat.',
      createdAt: new Date('2025-12-21T08:10:00.000Z'),
    });

    await ensureMessage(db, {
      id: DEMO_IDS.messages.referenceTwo,
      conversationId: DEMO_IDS.conversations.reference,
      senderId: DEMO_IDS.users.personA,
      content: 'Keeping this as old context for local testing.',
      createdAt: new Date('2025-12-21T08:40:00.000Z'),
    });

    await ensureMessage(db, {
      id: DEMO_IDS.messages.referenceThree,
      conversationId: DEMO_IDS.conversations.reference,
      senderId: DEMO_IDS.users.personB,
      content: 'Looks good. We can use this thread to verify history hydration.',
      createdAt: new Date('2025-12-21T09:15:00.000Z'),
    });

    await db
      .update(conversations)
      .set({ updatedAt: directUpdatedAt })
      .where(eq(conversations.id, DEMO_IDS.conversations.direct));
    await db
      .update(conversations)
      .set({ updatedAt: referenceUpdatedAt })
      .where(eq(conversations.id, DEMO_IDS.conversations.reference));

    console.log('Demo seed completed.');
    console.log('Users: person_a_demo, person_b_demo, person_ref_demo');
    console.log(`Shared demo password: ${DEMO_PASSWORD}`);
  } finally {
    await pool.end();
  }
}

seedDemoData().catch((error) => {
  console.error('Demo seed failed:', error);
  process.exit(1);
});
