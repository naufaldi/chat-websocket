import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
    metricsService.onModuleInit();
    middleware = new MetricsMiddleware(metricsService);
  });

  it('should track HTTP requests', () => {
    const req = {
      method: 'GET',
      route: { path: '/api/users' },
    } as unknown as Request;
    const res = {
      statusCode: 200,
      once: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.once).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
