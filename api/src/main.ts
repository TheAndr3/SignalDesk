import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe stripping unknown fields and preventing payload injection
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for frontend Vite dev server
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
  Logger.log(`SignalDesk API is running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
