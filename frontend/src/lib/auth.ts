'use client';

import { useAuthStore } from '../stores/authStore';

export function getToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken;
}

export function isLoggedIn(): boolean {
  return !!useAuthStore.getState().accessToken;
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
