import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
const backendApiBaseUrl = normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${backendApiBaseUrl}/:path*`,
        },
      ],
    };
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig);
