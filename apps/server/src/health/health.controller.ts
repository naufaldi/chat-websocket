import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

interface HealthResponse {
  status: string;
  timestamp: string;
}

interface LiveResponse {
  status: 'alive';
}

interface ReadyResponse {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

@Controller('health')
@SkipThrottle() // Health checks should not be rate limited
@UseGuards(ThrottlerGuard)
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  @Get('live')
  live(): LiveResponse {
    return {
      status: 'alive',
    };
  }

  @Get('ready')
  async ready(): Promise<ReadyResponse> {
    const checks: ReadyResponse['checks'] = {
      database: 'ok',
      redis: 'ok',
    };

    // Check database
    try {
      await this.databaseService.healthCheck();
    } catch {
      checks.database = 'error';
    }

    // Check Redis
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (redisUrl) {
        const redisClient = createClient({ url: redisUrl });
        await redisClient.connect();
        await redisClient.ping();
        await redisClient.disconnect();
      }
    } catch {
      // Redis is optional - don't fail readiness if Redis is down
      checks.redis = 'error';
    }

    const status: ReadyResponse['status'] =
      checks.database === 'ok' && checks.redis === 'ok' ? 'ready' : 'not_ready';

    return {
      status,
      checks,
    };
  }

  // Keep backward compatibility
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.databaseService.healthCheck();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
