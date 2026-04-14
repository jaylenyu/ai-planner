import {
  getToken,
  setToken,
  setRefreshToken,
  getRefreshToken,
  clearAllTokens,
} from './auth';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
export const API_BASE_URL = normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearAllTokens();
      return false;
    }

    const data = await res.json();
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    return true;
  } catch {
    clearAllTokens();
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = '요청 실패';
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed?.message) message = parsed.message;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
};

export const authApi = {
  requestEmailCode: (email: string, captchaToken: string) =>
    api.post<{ message: string }>('/auth/email/request-code', { email, captchaToken }),

  verifyEmailCode: (email: string, code: string) =>
    api.post<{ verified: boolean }>('/auth/email/verify-code', { email, code }),

  register: (
    email: string,
    password: string,
    agreedTerms: boolean,
    agreedPrivacy: boolean,
  ) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/register', {
      email,
      password,
      agreedTerms,
      agreedPrivacy,
    }),

  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/login', {
      email,
      password,
    }),
};
