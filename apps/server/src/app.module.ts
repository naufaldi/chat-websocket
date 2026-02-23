import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ConversationsModule } from './conversations/conversations.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { MessagesModule } from './messages/messages.module';
import { ReadReceiptsModule } from './read-receipts/read-receipts.module';
import { PresenceModule } from './presence/presence.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');

        // Create Redis storage if Redis URL is available, otherwise fall back to memory
        const storage = redisUrl
          ? new ThrottlerStorageRedisService(new Redis(redisUrl))
          : undefined;

        return {
          throttlers: [
            {
              name: 'short',     // Auth endpoints: 5 per 15 min
              ttl: 900000,
              limit: 5,
            },
            {
              name: 'default', // General endpoints: 100 per min
              ttl: 60000,
              limit: 100,
            },
            {
              name: 'search',  // Search endpoint: 10 per min
              ttl: 60000,
              limit: 10,
            },
          ],
          storage,
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ConversationsModule,
    UsersModule,
    ChatModule,
    MessagesModule,
    ReadReceiptsModule,
    PresenceModule,
    MetricsModule,
  ],
})
export class AppModule {}
