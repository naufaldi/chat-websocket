import { Injectable, Inject } from '@nestjs/common';

export const DRIZZLE = Symbol('DRIZZLE');

@Injectable()
export class DatabaseService {
  // eslint-disable-next-line no-unused-vars
  constructor(@Inject(DRIZZLE) public readonly db: any) {}

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
     
    } catch {
      return false;
    }
  }
}
