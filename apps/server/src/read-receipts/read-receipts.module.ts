import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReadReceiptsController } from './read-receipts.controller';
import { ReadReceiptsService } from './read-receipts.service';
import { ConversationsRepository } from '../conversations/conversations.repository';

@Module({
  imports: [ConfigModule],
  controllers: [ReadReceiptsController],
  providers: [ReadReceiptsService, ConversationsRepository],
  exports: [ReadReceiptsService],
})
export class ReadReceiptsModule {}
