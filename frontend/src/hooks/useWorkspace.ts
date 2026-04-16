'use client';

import { useEffect, useState } from 'react';
import { workspaceApi } from '../lib/api';
import type { WorkspaceMineResponse } from '../lib/types';

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceMineResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    setLoading(true);
    try {
      const next = await workspaceApi.mine();
      setData(next);
    } catch {
      setData({ workspace: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, []);

  return {
    workspace: data?.workspace ?? null,
    role: data?.role,
    loading,
    refetch,
  };
}

