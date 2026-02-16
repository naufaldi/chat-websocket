import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: {
    status: 'ok' | 'error';
    latencyMs?: number;
    error?: string;
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      await this.databaseService.healthCheck();
      const latencyMs = Date.now() - start;

      return {
        status: 'ok',
        timestamp,
        database: {
          status: 'ok',
          latencyMs,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp,
        database: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
