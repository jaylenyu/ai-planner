'use client';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function canTrack() {
  return (
    typeof window !== 'undefined' &&
    Boolean(GA_MEASUREMENT_ID) &&
    typeof window.gtag === 'function'
  );
}

export function pageview(url: string) {
  if (!canTrack()) return;

  window.gtag?.('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function event(action: string, params?: Record<string, unknown>) {
  if (!canTrack()) return;

  window.gtag?.('event', action, params ?? {});
}
