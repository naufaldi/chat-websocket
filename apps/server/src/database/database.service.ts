import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from './database.module';

@Injectable()
export class DatabaseService {
  constructor(@Inject(DRIZZLE) public readonly db: any) {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
