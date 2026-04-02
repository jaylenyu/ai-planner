'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { setToken, removeToken, isLoggedIn } from '../lib/auth';
import { AuthResponse } from '../lib/types';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/auth/register', { email, password });
      setToken(res.access_token);
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => removeToken();

  return { login, register, logout, loading, error, isLoggedIn: isLoggedIn() };
}
