import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@chat/db';
import { DatabaseService, DRIZZLE } from './database.service';
import type { DrizzleDB } from './database.types';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DrizzleDB => {
        const logger = new Logger('DatabaseModule');
        const connectionString = configService.getOrThrow<string>('DATABASE_URL');

        logger.log('Connecting to database...');

        const pool = new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        // Test connection on startup
        pool.on('error', (err) => {
          logger.error(`Database pool error: ${err.message}`);
        });

        pool.query('SELECT 1')
          .then(() => {
            logger.log('Database connected successfully');
          })
          .catch((err) => {
            logger.error(`Database connection failed: ${err.message}`);
            logger.error('Please ensure PostgreSQL is running and DATABASE_URL is correct in .env');
          });

        return drizzle(pool, { schema });
      },
    },
    DatabaseService,
  ],
  exports: [DRIZZLE, DatabaseService],
})
export class DatabaseModule {}
