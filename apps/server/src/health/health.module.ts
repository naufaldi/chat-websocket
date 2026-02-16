import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
})
export class HealthModule {}
