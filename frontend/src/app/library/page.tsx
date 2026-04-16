"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { usePlanList } from "@/hooks/usePlanList";
import { useCategories } from "@/hooks/useCategories";
import { planApi } from "@/lib/api";
import { PlanHistory } from "@/components/plan/PlanHistory";
import type { PlanSummary } from "@/lib/types";

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const {
    plans,
    loading: plansLoading,
    categoryId,
    setCategoryId,
    scope,
    setScope,
  } = usePlanList();
  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    saving: categorySaving,
  } = useCategories();
  const [categoryName, setCategoryName] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const handleCreateCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    await createCategory(name);
    setCategoryName("");
  };

  const handleDeletePlan = async (planId: string) => {
    const previousLists = queryClient.getQueriesData<PlanSummary[]>({
      queryKey: ['plans'],
    });
    queryClient.setQueriesData<PlanSummary[]>({ queryKey: ['plans'] }, (old) =>
      (old ?? []).filter((plan) => plan.id !== planId),
    );
    try {
      await planApi.delete(planId);
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
    } catch (error) {
      previousLists.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      throw error;
    }
  };

  return (
    <div className="bg-[var(--background)]">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AppCard padding="md" className="h-fit lg:sticky lg:top-24">
            <h1 className="text-base font-bold text-stone-800">카테고리</h1>
            <p className="mt-1 text-sm text-stone-500">
              {selectedCategory ? selectedCategory.name : "전체 일정"}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="새 카테고리 이름"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
              <PrimaryButton
                type="button"
                variant="brand"
                size="sm"
                loading={categorySaving}
                onClick={handleCreateCategory}
                className="w-full"
              >
                카테고리 추가
              </PrimaryButton>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCategoryId(undefined)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  categoryId
                    ? "border-stone-200 bg-white text-stone-600"
                    : "border-orange-200 bg-orange-50 text-orange-700"
                }`}
              >
                전체
              </button>
              {categoriesLoading ? (
                <p className="text-sm text-stone-400">
                  카테고리 불러오는 중...
                </p>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      categoryId === category.id
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-stone-200 bg-white text-stone-600"
                    }`}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
          </AppCard>

          <AppCard padding="md">
            <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-stone-800">
                  {scope === "shared"
                    ? "공유 일정"
                    : scope === "personal"
                      ? "개인 일정"
                      : "전체 일정"}
                </h2>
                <p className="text-sm text-stone-500">
                  삭제와 분류는 무료 플랜에서도 가능합니다.
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <div className="grid w-full grid-cols-3 rounded-xl border border-stone-200 bg-white p-1 text-xs sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setScope(undefined)}
                    className={`min-w-0 rounded-lg px-2 py-1.5 text-center text-[13px] whitespace-nowrap sm:px-3 ${scope === undefined ? "bg-orange-50 text-orange-700" : "text-stone-600"}`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("personal")}
                    className={`min-w-0 rounded-lg px-2 py-1.5 text-center text-[13px] whitespace-nowrap sm:px-3 ${scope === "personal" ? "bg-orange-50 text-orange-700" : "text-stone-600"}`}
                  >
                    개인
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("shared")}
                    className={`min-w-0 rounded-lg px-2 py-1.5 text-center text-[13px] whitespace-nowrap sm:px-3 ${scope === "shared" ? "bg-orange-50 text-orange-700" : "text-stone-600"}`}
                  >
                    공유
                  </button>
                </div>
              </div>
            </div>

            <PlanHistory
              plans={plans}
              loading={plansLoading}
              onDeletePlan={handleDeletePlan}
            />
          </AppCard>
        </div>
      </main>
    </div>
  );
}
