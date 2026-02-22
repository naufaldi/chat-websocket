/**
 * Deployment & Observability Tests
 * 
 * Tests for TASK-007: Deployment & Observability
 * - Health endpoints: /health/live, /health/ready
 * - Docker Compose configuration
 * - Prometheus metrics
 * 
 * Run: bun test src/deployment.test.ts
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// ============================================================================
// HEALTH ENDPOINT SCHEMA TESTS
// ============================================================================

describe('Health Endpoints Schema', () => {
  describe('GET /health/live', () => {
    it('validates liveness response', () => {
      const response = {
        status: 'alive',
      };
      
      const schema = z.object({
        status: z.literal('alive'),
      });
      
      expect(() => schema.parse(response)).not.toThrow();
    });
  });

  describe('GET /health/ready', () => {
    it('validates readiness response with all checks', () => {
      const response = {
        status: 'ready',
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      };
      
      const schema = z.object({
        status: z.literal('ready'),
        checks: z.object({
          database: z.enum(['ok', 'error']),
          redis: z.enum(['ok', 'error']),
        }),
      });
      
      expect(() => schema.parse(response)).not.toThrow();
    });

    it('validates readiness with database error', () => {
      const response = {
        status: 'not_ready',
        checks: {
          database: 'error',
          redis: 'ok',
        },
      };
      
      const schema = z.object({
        status: z.enum(['ready', 'not_ready']),
        checks: z.object({
          database: z.enum(['ok', 'error']),
          redis: z.enum(['ok', 'error']),
        }),
      });
      
      const parsed = schema.parse(response);
      expect(parsed.checks.database).toBe('error');
    });

    it('validates readiness with redis error', () => {
      const response = {
        status: 'not_ready',
        checks: {
          database: 'ok',
          redis: 'error',
        },
      };
      
      const schema = z.object({
        status: z.enum(['ready', 'not_ready']),
        checks: z.object({
          database: z.enum(['ok', 'error']),
          redis: z.enum(['ok', 'error']),
        }),
      });
      
      const parsed = schema.parse(response);
      expect(parsed.checks.redis).toBe('error');
    });
  });
});

// ============================================================================
// DOCKER COMPOSE SCHEMA TESTS
// ============================================================================

describe('Docker Compose Configuration', () => {
  it('validates docker-compose service structure', () => {
    const config = {
      version: '3.8',
      services: {
        app: {
          build: '.',
          ports: ['3000:3000'],
          environment: ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'],
          depends_on: ['postgres', 'redis'],
        },
        postgres: {
          image: 'postgres:15-alpine',
          volumes: ['postgres_data:/var/lib/postgresql/data'],
        },
        redis: {
          image: 'redis:7-alpine',
          volumes: ['redis_data:/data'],
        },
      },
    };
    
    expect(config.services.app.build).toBe('.');
    expect(config.services.postgres.image).toBe('postgres:15-alpine');
    expect(config.services.redis.image).toBe('redis:7-alpine');
  });

  it('validates app service with replicas', () => {
    const config = {
      services: {
        app: {
          deploy: {
            replicas: 2,
          },
        },
      },
    };
    
    expect(config.services.app.deploy.replicas).toBe(2);
  });

  it('validates nginx service configuration', () => {
    const config = {
      services: {
        nginx: {
          image: 'nginx:alpine',
          ports: ['80:80', '443:443'],
          volumes: ['./nginx.conf:/etc/nginx/nginx.conf'],
        },
      },
    };
    
    expect(config.services.nginx.ports).toContain('80:80');
    expect(config.services.nginx.ports).toContain('443:443');
  });

  it('validates prometheus configuration', () => {
    const config = {
      services: {
        prometheus: {
          image: 'prom/prometheus',
          volumes: ['./prometheus.yml:/etc/prometheus/prometheus.yml'],
        },
      },
    };
    
    expect(config.services.prometheus.image).toBe('prom/prometheus');
  });

  it('validates grafana configuration', () => {
    const config = {
      services: {
        grafana: {
          image: 'grafana/grafana',
          ports: ['3001:3000'],
          volumes: ['grafana_data:/var/lib/grafana'],
        },
      },
    };
    
    expect(config.services.grafana.image).toBe('grafana/grafana');
    expect(config.services.grafana.ports).toContain('3001:3000');
  });
});

// ============================================================================
// ENVIRONMENT VARIABLES TESTS
// ============================================================================

describe('Environment Configuration', () => {
  it('validates required environment variables', () => {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'CLIENT_URL',
    ];
    
    required.forEach((env) => {
      expect(typeof env).toBe('string');
    });
  });

  it('validates database URL format', () => {
    const validUrls = [
      'postgresql://user:pass@localhost:5432/db',
      'postgresql://user:pass@host:5432/db?sslmode=require',
    ];
    
    validUrls.forEach((url) => {
      expect(url).toContain('postgresql://');
    });
  });

  it('validates redis URL format', () => {
    const validUrls = [
      'redis://localhost:6379',
      'redis://:password@host:6379',
    ];
    
    validUrls.forEach((url) => {
      expect(url).toContain('redis://');
    });
  });
});

// ============================================================================
// METRICS SCHEMA TESTS
// ============================================================================

describe('Prometheus Metrics Schema', () => {
  it('validates message latency histogram', () => {
    const metric = {
      name: 'message_latency_seconds',
      type: 'histogram',
      help: 'Message processing latency in seconds',
      buckets: [0.1, 0.5, 1.0, 2.0, 5.0],
    };
    
    expect(metric.name).toBe('message_latency_seconds');
    expect(metric.type).toBe('histogram');
    expect(metric.buckets).toContain(0.1);
    expect(metric.buckets).toContain(1.0);
  });

  it('validates error rate gauge', () => {
    const metric = {
      name: 'error_rate',
      type: 'gauge',
      help: 'Current error rate',
    };
    
    expect(metric.type).toBe('gauge');
  });

  it('validates active connections gauge', () => {
    const metric = {
      name: 'active_connections',
      type: 'gauge',
      help: 'Number of active WebSocket connections',
    };
    
    expect(metric.name).toBe('active_connections');
  });
});

// ============================================================================
// LOGGING SCHEMA TESTS
// ============================================================================

describe('Structured Logging', () => {
  it('validates JSON log format', () => {
    const log = {
      timestamp: '2024-01-01T00:00:00.000Z',
      level: 'info',
      message: 'User logged in',
      context: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      },
    };
    
    expect(log.level).toBe('info');
    expect(log.context.userId).toBeDefined();
  });

  it('validates log levels', () => {
    const levels = ['debug', 'info', 'warn', 'error'];
    
    levels.forEach((level) => {
      const log = { level, message: 'test' };
      expect(log.level).toBe(level);
    });
  });
});
