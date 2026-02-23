import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply metrics middleware to all routes except /metrics itself
    consumer
      .apply(MetricsMiddleware)
      .exclude('/api/metrics', 'metrics')
      .forRoutes('*');
  }
}
