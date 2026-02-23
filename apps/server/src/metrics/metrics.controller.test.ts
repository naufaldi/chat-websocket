import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
    service.onModuleInit();
    controller = new MetricsController(service);
  });

  describe('getMetrics', () => {
    it('should return metrics on /metrics endpoint', async () => {
      const result = await controller.getMetrics();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return Prometheus-formatted metrics', async () => {
      const result = await controller.getMetrics();

      // Prometheus format has metric names followed by values
      const lines = result.split('\n');
      const hasMetricLine = lines.some(line =>
        line.includes(' ') && !line.startsWith('#')
      );
      expect(hasMetricLine).toBe(true);
    });
  });
});
