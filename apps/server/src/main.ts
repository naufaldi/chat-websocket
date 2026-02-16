import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

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

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('Real-time chat system API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;

  try {
    await app.listen(port);
    console.log(`Server running on port ${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/docs`);
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please stop the existing server or use a different port.`);
      console.error(`You can change the port by setting the PORT environment variable.`);
      process.exit(1);
    }
    throw error;
  }
}
bootstrap();
