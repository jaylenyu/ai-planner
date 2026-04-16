'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { categoryApi } from '../lib/api';
import type { CategorySummary } from '../lib/types';
import { queryKeys } from '../lib/query';

export function useCategories() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const query = useQuery<CategorySummary[]>({
    queryKey: queryKeys.categories,
    queryFn: () => categoryApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => categoryApi.create({ name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    saving,
    refetch: query.refetch,
    createCategory: async (name: string) => {
      setSaving(true);
      try {
        await createMutation.mutateAsync(name);
      } finally {
        setSaving(false);
      }
    },
  };
}
