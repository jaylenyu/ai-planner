'use client';

import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import type { SubscriptionStatusResponse } from '@/lib/types';

export function useSubscriptionStatus() {
  const query = useQuery<SubscriptionStatusResponse>({
    queryKey: queryKeys.subscriptionStatus,
    queryFn: () => billingApi.status(),
    staleTime: 60 * 1000,
  });

  return {
    status: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
