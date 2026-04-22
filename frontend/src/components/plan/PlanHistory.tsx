'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, X } from 'lucide-react';
import { TYPE_ICONS } from '../../lib/types';
import type { PlanSummary } from '../../lib/types';
import { Spinner } from '../ui/Spinner';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface PlanHistoryProps {
  plans: PlanSummary[];
  loading: boolean;
  onDeletePlan?: (planId: string) => Promise<void> | void;
}

export function PlanHistory({
  plans,
  loading,
  onDeletePlan,
}: PlanHistoryProps) {
  const router = useRouter();
  const [pendingDeletePlanId, setPendingDeletePlanId] = useState<string | null>(null);

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
          <Clock3 className="h-4 w-4 text-stone-500" />
        </div>
        <h2 className="text-lg font-bold text-stone-800">이전 일정</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {plans.map((plan) => (
          <div
            key={plan.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/library/plans/${plan.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                router.push(`/library/plans/${plan.id}`);
              }
            }}
            className="group cursor-pointer rounded-2xl border border-stone-200 bg-white p-5 transition-all duration-300 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-200/70"
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
                  {plan.category && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${plan.category.color}12`,
                        borderColor: `${plan.category.color}33`,
                        color: plan.category.color,
                      }}
                    >
                      {plan.category.name}
                    </span>
                  )}
                  {plan.workspace && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-600">
                      커플 플랜
                    </span>
                  )}
                  <span className="text-xs text-stone-400">
                    {new Date(plan.createdAt).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </span>
                </div>
                {plan.workspace && plan.user?.email && (
                  <p className="mt-1 text-xs text-stone-500">
                    생성자 {plan.user.email}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {onDeletePlan && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDeletePlanId(plan.id);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    aria-label="일정 삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
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
      <ConfirmDialog
        open={!!pendingDeletePlanId}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePlanId(null);
        }}
        title="이 일정을 삭제할까요?"
        description="삭제 후에는 다시 복구할 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={async () => {
          if (!pendingDeletePlanId || !onDeletePlan) return;
          await onDeletePlan(pendingDeletePlanId);
          setPendingDeletePlanId(null);
        }}
      />
    </div>
  );
}
