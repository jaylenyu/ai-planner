'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { planApi } from '../lib/api';
import type { PlanSummary } from '../lib/types';
import { queryKeys } from '../lib/query';

export function usePlanList() {
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<'personal' | 'shared' | undefined>();

  const query = useQuery<PlanSummary[]>({
    queryKey: queryKeys.plans(categoryId, scope),
    queryFn: async () => {
      setLoading(true);
      try {
        return await planApi.list(categoryId, scope);
      } finally {
        setLoading(false);
      }
    },
    staleTime: 30 * 1000,
  });

  return {
    plans: query.data ?? [],
    loading: loading || query.isLoading,
    refetch: query.refetch,
    categoryId,
    setCategoryId,
    scope,
    setScope,
  };
}
