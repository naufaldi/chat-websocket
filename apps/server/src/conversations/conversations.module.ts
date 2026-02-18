import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from '../messages/messages.repository';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository, MessagesRepository],
  exports: [ConversationsService, ConversationsRepository],
})
export class ConversationsModule {}
