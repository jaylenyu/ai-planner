'use client';

import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { PlanResult, PlanMode } from '../lib/types';

type Status = 'idle' | 'loading' | 'success' | 'error';

type DailyLimitError = {
  message: string;
  limit: number;
  used: number;
  resetTime: string;
};

export function usePlanGenerate() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dailyLimitError, setDailyLimitError] = useState<DailyLimitError | null>(null);

  const generate = async (rawInput: string, mode: PlanMode) => {
    setStatus('loading');
    setError(null);
    setResult(null);
    setDailyLimitError(null);
    try {
      const data = await api.post<PlanResult>('/plan/generate', { rawInput, mode });
      setResult(data);
      setStatus('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.payload && typeof err.payload === 'object') {
        const payload = err.payload as Partial<DailyLimitError>;
        if (
          typeof payload.message === 'string' &&
          typeof payload.limit === 'number' &&
          typeof payload.used === 'number' &&
          typeof payload.resetTime === 'string'
        ) {
          setDailyLimitError({
            message: payload.message,
            limit: payload.limit,
            used: payload.used,
            resetTime: payload.resetTime,
          });
        }
      }
      setError(err instanceof Error ? err.message : '일정 생성 실패');
      setStatus('error');
    }
  };

  return { generate, status, result, error, dailyLimitError };
}
