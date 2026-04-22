import * as Sentry from '@sentry/nextjs';
import { sanitizeSentryEvent } from './src/lib/sentry';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    beforeSend: (event) => sanitizeSentryEvent(event),
    ignoreErrors: ['ChunkLoadError', /ResizeObserver/],
  });
}
