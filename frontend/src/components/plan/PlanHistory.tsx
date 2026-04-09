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
      <div className="flex justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (plans.length === 0) return null;

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-stone-100">
          <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-stone-800">이전 일정</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="group rounded-2xl border border-stone-200 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:shadow-stone-100 hover:border-stone-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 leading-relaxed line-clamp-2">
                  {plan.summary ?? plan.rawInput}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    plan.mode === 'date'
                      ? 'bg-pink-50 text-pink-600 border border-pink-200'
                      : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                  }`}>
                    {plan.mode === 'date' ? '💑 데이트' : '🧳 여행'}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(plan.createdAt).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {plan.items.map((item) => (
                <span
                  key={item.order}
                  className="inline-flex items-center gap-1 rounded-full bg-stone-50 border border-stone-100 px-2.5 py-1 text-xs text-stone-600 transition-colors group-hover:border-stone-200"
                >
                  {TYPE_ICONS[item.type] ?? '📍'} {item.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
