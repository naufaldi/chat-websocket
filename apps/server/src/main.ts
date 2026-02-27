import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './chat/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Set global API prefix
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisAdapter = new RedisIoAdapter(app.getHttpServer());
    try {
      await redisAdapter.connectToRedis(redisUrl);
      app.useWebSocketAdapter(redisAdapter);
    } catch (error) {
      console.warn(`WebSocket Redis adapter unavailable, falling back to in-memory adapter: ${String(error)}`);
    }
  }

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('Real-time chat system API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    await app.close();
    console.log('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  try {
    await app.listen(port);
    console.log(`Server running on port ${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please stop the existing server or use a different port.`);
      console.error(`You can change the port by setting the PORT environment variable.`);
      process.exit(1);
    }
    throw error;
  }
}
bootstrap();
