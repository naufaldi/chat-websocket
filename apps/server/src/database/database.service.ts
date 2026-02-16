import { Injectable, Inject } from '@nestjs/common';

export const DRIZZLE = Symbol('DRIZZLE');

@Injectable()
export class DatabaseService {
  constructor(@Inject(DRIZZLE) public readonly db: any) {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
    } catch (_error) {
      return false;
    }
  }
}
