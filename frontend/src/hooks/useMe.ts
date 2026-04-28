'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe } from '../lib/api';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe });
}

export function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
}
