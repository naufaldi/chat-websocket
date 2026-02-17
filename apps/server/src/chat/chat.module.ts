import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsRepository } from '../conversations/conversations.repository';
import { MessagesRepository } from '../messages/messages.repository';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';

@Module({
  imports: [AuthModule],
  providers: [ChatGateway, ChatService, PresenceService, ConversationsRepository, MessagesRepository],
  exports: [ChatService, PresenceService],
})
export class ChatModule {}
