'use client';

import { useState } from 'react';
import { ApiError, planApi } from '../lib/api';
import { PlanPreviewResult, PlanResult, PlanMode } from '../lib/types';

type Status = 'idle' | 'loading' | 'success' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type DailyLimitError = {
  message: string;
  limit: number;
  used: number;
  resetTime: string;
};

export function usePlanGenerate() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PlanPreviewResult | PlanResult | null>(null);
  const [savedResult, setSavedResult] = useState<PlanResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dailyLimitError, setDailyLimitError] = useState<DailyLimitError | null>(null);

  const generate = async (rawInput: string, mode: PlanMode) => {
    setStatus('loading');
    setError(null);
    setResult(null);
    setSavedResult(null);
    setSaveStatus('idle');
    setSaveError(null);
    setDailyLimitError(null);
    try {
      const data = await planApi.preview({ rawInput, mode });
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

  const save = async (
    draftId: string,
    scope: 'personal' | 'shared',
    workspaceId?: string,
  ) => {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const data = await planApi.save({ draftId, scope, workspaceId });
      setSavedResult(data);
      setResult(data);
      setSaveStatus('saved');
      return data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '일정 저장 실패');
      setSaveStatus('error');
      return null;
    }
  };

  return {
    generate,
    save,
    status,
    result,
    savedResult,
    saveStatus,
    error,
    saveError,
    dailyLimitError,
  };
}
