import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Prometheus from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: Prometheus.Registry;
  private httpRequestsTotal!: Prometheus.Counter;
  private httpRequestDuration!: Prometheus.Histogram;
  private websocketConnectionsActive!: Prometheus.Gauge;

  constructor() {
    // Create isolated registry for this service instance
    this.register = new Prometheus.Registry();
  }

  onModuleInit(): void {
    // Register default metrics in our isolated registry
    Prometheus.collectDefaultMetrics({ register: this.register });

    // HTTP request counter
    this.httpRequestsTotal = new Prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new Prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.register],
    });

    // Active WebSocket connections gauge
    this.websocketConnectionsActive = new Prometheus.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.register],
    });
  }

  incrementHttpRequests(method: string, route: string, status: number): void {
    this.httpRequestsTotal.inc({ method, route, status: status.toString() });
  }

  observeHttpRequestDuration(method: string, route: string, duration: number): void {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  setActiveWebSocketConnections(count: number): void {
    this.websocketConnectionsActive.set(count);
  }

  getMetrics(): string {
    return this.register.metrics();
  }
}
