'use client';

const ACCESS_TOKEN_KEY = 'ai_planner_token';
const REFRESH_TOKEN_KEY = 'ai_planner_refresh';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setCookie(ACCESS_TOKEN_KEY, token, COOKIE_MAX_AGE);
}

export function removeToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  deleteCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  setCookie(REFRESH_TOKEN_KEY, token, COOKIE_MAX_AGE);
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function clearAllTokens(): void {
  removeToken();
  removeRefreshToken();
}

export function getAuthUser():
  | {
      userId?: string;
      email?: string;
    }
  | null {
  const token = getToken();
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return {
      userId: typeof decoded.sub === 'string' ? decoded.sub : undefined,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
    };
  } catch {
    return null;
  }
}
