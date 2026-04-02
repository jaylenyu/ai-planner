'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { PlanResult, PlanMode } from '../lib/types';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function usePlanGenerate() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (rawInput: string, mode: PlanMode) => {
    setStatus('loading');
    setError(null);
    setResult(null);
    try {
      const data = await api.post<PlanResult>('/plan/generate', { rawInput, mode });
      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 생성 실패');
      setStatus('error');
    }
  };

  return { generate, status, result, error };
}
