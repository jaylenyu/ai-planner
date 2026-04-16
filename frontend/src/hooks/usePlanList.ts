'use client';

import { useState, useEffect } from 'react';
import { planApi } from '../lib/api';
import type { PlanSummary } from '../lib/types';

export function usePlanList() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<'personal' | 'shared' | undefined>();

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await planApi.list(categoryId, scope);
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoading(true);
      try {
        const data = await planApi.list(categoryId, scope);
        if (!cancelled) {
          setPlans(data);
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [categoryId, scope]);

  return {
    plans,
    loading,
    refetch,
    categoryId,
    setCategoryId,
    scope,
    setScope,
  };
}
