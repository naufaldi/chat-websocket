import { Injectable, Inject } from '@nestjs/common';
import type { DrizzleDB } from './database.types';

export const DRIZZLE = Symbol('DRIZZLE');

@Injectable()
export class DatabaseService {
  constructor(@Inject(DRIZZLE) public readonly db: DrizzleDB) {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
