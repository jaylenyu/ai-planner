const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');

export const SERVER_API_BASE_URL = normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;
