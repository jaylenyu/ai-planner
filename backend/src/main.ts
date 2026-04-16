import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const origins = corsOrigin.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
