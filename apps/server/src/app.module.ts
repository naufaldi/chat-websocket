import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 900000,  // 15 minutes
      limit: 5,
    }]),
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
