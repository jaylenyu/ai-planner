'use client';

import { useState } from 'react';
import { api, authApi, ApiError } from '../lib/api';
import { event } from '../lib/ga4';
import {
  useAuthStore,
  selectIsLoggedIn,
  selectHydrated,
} from '../stores/authStore';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const hydrated = useAuthStore(selectHydrated);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const res = await authApi.login(email, password);
      useAuthStore.getState().setTokens(res.access_token, res.refresh_token);
      event('login', { method: 'email' });
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorStatus(err.status);
      } else {
        setError('로그인 실패');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // 로그아웃 실패해도 로컬 토큰은 삭제
    } finally {
      useAuthStore.getState().clearTokens();
    }
  };

  return { login, logout, loading, error, errorStatus, isLoggedIn, hydrated };
}
