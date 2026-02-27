import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions, Server } from 'socket.io';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private pubClient?: RedisClient;
  private subClient?: RedisClient;

  constructor(httpServer?: object) {
    super(httpServer);
  }

  async connectToRedis(redisUrl: string): Promise<void> {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.pubClient = pubClient;
    this.subClient = subClient;
    this.logger.log('WebSocket Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    if (port === 0 && (!this.httpServer || typeof (this.httpServer as { listeners?: unknown }).listeners !== 'function')) {
      throw new Error('RedisIoAdapter requires a valid Node HTTP server with listeners() support');
    }
    const server = super.createIOServer(port, options);
    if (this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }
    return server;
  }

  async close(): Promise<void> {
    await Promise.all([
      this.pubClient?.disconnect(),
      this.subClient?.disconnect(),
    ]);
  }
}
