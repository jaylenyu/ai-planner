import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as (
  ...args: unknown[]
) => unknown;
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { sanitizeSentryEvent } from './common/sentry/sentry.util';

async function bootstrap() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      beforeSend: (event) => sanitizeSentryEvent(event),
      ignoreErrors: ['ChunkLoadError', /ResizeObserver/],
    });
  }

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
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
  app.useGlobalFilters(new SentryExceptionFilter());
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
