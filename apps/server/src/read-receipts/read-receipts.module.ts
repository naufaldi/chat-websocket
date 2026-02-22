import { Module } from '@nestjs/common';
import { ReadReceiptsController } from './read-receipts.controller';
import { ReadReceiptsService } from './read-receipts.service';

@Module({
  controllers: [ReadReceiptsController],
  providers: [ReadReceiptsService],
  exports: [ReadReceiptsService],
})
export class ReadReceiptsModule {}
