import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from '../messages/messages.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository, MessagesRepository],
  exports: [ConversationsService, ConversationsRepository],
})
export class ConversationsModule {}
