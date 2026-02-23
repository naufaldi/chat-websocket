import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import type { Response } from 'express';

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
      const res = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      await controller.getMetrics(res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
      expect(res.send).toHaveBeenCalled();
      const sentData = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(typeof sentData).toBe('string');
      expect(sentData.length).toBeGreaterThan(0);
    });

    it('should return Prometheus-formatted metrics', async () => {
      const res = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      await controller.getMetrics(res);

      const sentData = (res.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Prometheus format has metric names followed by values
      const lines = sentData.split('\n');
      const hasMetricLine = lines.some(line =>
        line.includes(' ') && !line.startsWith('#')
      );
      expect(hasMetricLine).toBe(true);
    });
  });
});
