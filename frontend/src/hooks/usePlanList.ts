'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface PlanSummary {
  id: string;
  rawInput: string;
  mode: string;
  summary: string | null;
  createdAt: string;
  items: { order: number; name: string; type: string; time: string }[];
}

export function usePlanList() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.get<PlanSummary[]>('/plan/list');
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return { plans, loading, refetch: fetchPlans };
}
