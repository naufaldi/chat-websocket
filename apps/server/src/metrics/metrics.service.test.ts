import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
    service.onModuleInit();
  });

  describe('incrementHttpRequests', () => {
    it('should increment HTTP request counter', () => {
      service.incrementHttpRequests('GET', '/api/users', 200);

      const metrics = service.getMetrics();
      expect(metrics).toContain('http_requests_total');
    });
  });

  describe('observeHttpRequestDuration', () => {
    it('should observe HTTP request duration', () => {
      service.observeHttpRequestDuration('POST', '/api/auth/login', 0.05);

      const metrics = service.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds');
    });
  });

  describe('setActiveWebSocketConnections', () => {
    it('should set WebSocket connections gauge', () => {
      service.setActiveWebSocketConnections(42);

      const metrics = service.getMetrics();
      expect(metrics).toContain('websocket_connections_active');
      expect(metrics).toContain('42');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', () => {
      service.incrementHttpRequests('GET', '/api/health', 200);

      const metrics = service.getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include process metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics).toContain('process_');
    });
  });
});
