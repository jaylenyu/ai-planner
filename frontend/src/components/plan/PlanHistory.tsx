'use client';

import Link from 'next/link';
import { TYPE_ICONS } from '../../lib/types';
import type { CategorySummary, PlanSummary } from '../../lib/types';
import { Spinner } from '../ui/Spinner';
import { PrimaryButton } from '../ui/primary-button';

interface PlanHistoryProps {
  plans: PlanSummary[];
  loading: boolean;
  categories?: CategorySummary[];
  onChangeCategory?: (planId: string, categoryId: string | null) => Promise<void> | void;
  onDeletePlan?: (planId: string) => Promise<void> | void;
}

export function PlanHistory({
  plans,
  loading,
  categories,
  onChangeCategory,
  onDeletePlan,
}: PlanHistoryProps) {
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
                      공유
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
                <PrimaryButton asChild type="button" variant="outline" size="sm">
                  <Link href={`/plans/${plan.id}`}>열기</Link>
                </PrimaryButton>
                {onDeletePlan && (
                  <PrimaryButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('이 일정을 삭제할까요?')) {
                        void onDeletePlan(plan.id);
                      }
                    }}
                  >
                    삭제
                  </PrimaryButton>
                )}
              </div>
            </div>

            {categories && onChangeCategory && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  카테고리
                </label>
                <select
                  value={plan.category?.id ?? ''}
                  onChange={(e) =>
                    void onChangeCategory(
                      plan.id,
                      e.target.value ? e.target.value : null,
                    )
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-orange-300"
                >
                  <option value="">미분류</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
