'use client';

import { useAuthStore } from '../stores/authStore';
import { decodeJwtPayload, isJwtExpired } from './jwt';

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
      role?: 'USER' | 'ADMIN';
    }
  | null {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = decodeJwtPayload(token);
    if (!decoded || isJwtExpired(decoded)) return null;
    return {
      userId: typeof decoded.sub === 'string' ? decoded.sub : undefined,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
      role:
        decoded.role === 'ADMIN' || decoded.role === 'USER'
          ? decoded.role
          : undefined,
    };
  } catch {
    return null;
  }
}
