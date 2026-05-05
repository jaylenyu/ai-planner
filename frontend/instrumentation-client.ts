import * as Sentry from '@sentry/nextjs';
import { pageview } from './src/lib/ga4';
import './sentry.client.config';

export function onRouterTransitionStart(
  ...args: Parameters<typeof Sentry.captureRouterTransitionStart>
) {
  Sentry.captureRouterTransitionStart(...args);
  const url = args[0];
  if (typeof url === 'string') {
    pageview(url);
  }
}
