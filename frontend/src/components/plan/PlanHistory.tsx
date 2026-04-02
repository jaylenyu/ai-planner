'use client';

import { PlanSummary } from '../../hooks/usePlanList';
import { TYPE_ICONS } from '../../lib/types';
import { Spinner } from '../ui/Spinner';

interface PlanHistoryProps {
  plans: PlanSummary[];
  loading: boolean;
}

export function PlanHistory({ plans, loading }: PlanHistoryProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (plans.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100">
      <h2 className="mb-4 text-base font-semibold text-zinc-800">🕐 최근 일정</h2>
      <ul className="flex flex-col gap-3">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  {plan.summary ?? plan.rawInput}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {plan.mode === 'date' ? '💑 데이트' : '🗺 당일치기'} ·{' '}
                  {new Date(plan.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {plan.items.map((item) => (
                <span
                  key={item.order}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600"
                >
                  {TYPE_ICONS[item.type] ?? '📍'} {item.name}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
