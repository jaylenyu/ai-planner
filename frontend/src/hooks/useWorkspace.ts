'use client';

import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../lib/api';
import type { WorkspaceMineResponse } from '../lib/types';
import { queryKeys } from '../lib/query';

export function useWorkspace() {
  const query = useQuery<WorkspaceMineResponse>({
    queryKey: queryKeys.workspaceMine,
    queryFn: async () => {
      try {
        return await workspaceApi.mine();
      } catch {
        return { workspace: null };
      }
    },
    staleTime: 30 * 1000,
  });

  return {
    workspace: query.data?.workspace ?? null,
    role: query.data?.role,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
