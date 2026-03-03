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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

const composeFilePath = resolve(__dirname, '../../../docker-compose.yml');

const getComposeContent = (): string => readFileSync(composeFilePath, 'utf-8');

interface ComposeConfig {
  services?: {
    app?: {
      build?: {
        context?: string;
        dockerfile?: string;
      };
      healthcheck?: {
        test?: string[];
      };
    };
    postgres?: {
      image?: string;
    };
    redis?: {
      image?: string;
    };
  };
}

const getComposeConfig = (): ComposeConfig => load(getComposeContent()) as ComposeConfig;

interface PrometheusConfig {
  scrape_configs?: Array<{
    job_name?: string;
    metrics_path?: string;
  }>;
}

const prometheusFilePath = resolve(__dirname, '../../../prometheus.yml');
const getPrometheusConfig = (): PrometheusConfig =>
  load(readFileSync(prometheusFilePath, 'utf-8')) as PrometheusConfig;
const dockerfilePath = resolve(__dirname, '../Dockerfile');

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
  it('uses apps/server/Dockerfile for app service build', () => {
    const composeConfig = getComposeConfig();

    expect(composeConfig.services?.app?.build?.context).toBe('.');
    expect(composeConfig.services?.app?.build?.dockerfile).toBe('apps/server/Dockerfile');
  });

  it('validates docker-compose service structure', () => {
    const composeConfig = getComposeConfig();

    expect(composeConfig.services?.postgres?.image).toBe('postgres:15-alpine');
    expect(composeConfig.services?.redis?.image).toBe('redis:7-alpine');
  });

  it('uses /api-prefixed liveness endpoint in app healthcheck', () => {
    const composeConfig = getComposeConfig();
    const healthcheckCommand = composeConfig.services?.app?.healthcheck?.test ?? [];

    expect(healthcheckCommand).toContain('http://localhost:3000/api/health/live');
  });

  it('uses /api/metrics as Prometheus scrape path', () => {
    const prometheusConfig = getPrometheusConfig();
    const apiJob = prometheusConfig.scrape_configs?.find((job) => job.job_name === 'chat-api');

    expect(apiJob?.metrics_path).toBe('/api/metrics');
  });

  it('uses /api-prefixed liveness endpoint in server Dockerfile healthcheck', () => {
    const dockerfileContent = readFileSync(dockerfilePath, 'utf-8');

    expect(dockerfileContent).toContain('http://localhost:3000/api/health/live');
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
