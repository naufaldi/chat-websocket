import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FriendsRepository } from './friends.repository';

@Module({
  imports: [DatabaseModule],
  providers: [FriendsRepository],
  exports: [FriendsRepository],
})
export class FriendsModule {}
