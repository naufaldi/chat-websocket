import { Injectable, Inject } from '@nestjs/common';

export const DRIZZLE = Symbol('DRIZZLE');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleDB = any;

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
