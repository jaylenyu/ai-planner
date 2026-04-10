'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { setToken, setRefreshToken, getRefreshToken, clearAllTokens, getToken } from '../lib/auth';
import { AuthResponse } from '../lib/types';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/auth/register', { email, password });
      setToken(res.access_token);
      setRefreshToken(res.refresh_token);
      setIsLoggedIn(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      setToken(res.access_token);
      setRefreshToken(res.refresh_token);
      setIsLoggedIn(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // 로그아웃 실패해도 로컬 토큰은 삭제
    } finally {
      clearAllTokens();
      setIsLoggedIn(false);
    }
  };

  return { login, register, logout, loading, error, isLoggedIn };
}
