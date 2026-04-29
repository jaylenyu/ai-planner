'use client';

import { useParams } from 'next/navigation';
import { PlanDetailView } from '@/components/plan/PlanDetailView';

export default function WorkspacePlanDetailPage() {
  const params = useParams<{ id: string }>();

  return <PlanDetailView planId={params.id} source="workspace" />;
}
