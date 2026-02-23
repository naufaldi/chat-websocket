import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const method = req.method;
    const route = req.route?.path || req.path || 'unknown';

    res.once('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const status = res.statusCode;

      this.metricsService.incrementHttpRequests(method, route, status);
      this.metricsService.observeHttpRequestDuration(method, route, duration);
    });

    next();
  }
}
