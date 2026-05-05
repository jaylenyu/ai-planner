"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AppCard } from "@/components/custom/app-card";
import { PrimaryButton } from "@/components/custom/primary-button";
import { usePlanList } from "@/hooks/usePlanList";
import { useCategories } from "@/hooks/useCategories";
import { useWorkspace } from "@/hooks/useWorkspace";
import { planApi } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { PlanHistory } from "@/components/plan/PlanHistory";
import type { PlanSummary } from "@/lib/types";

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const {
    plans,
    loading: plansLoading,
    categoryId,
    setCategoryId,
  } = usePlanList("personal");
  const { workspace, loading: workspaceLoading } = useWorkspace();
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

  const handleSharePlan = async (plan: PlanSummary) => {
    const previousLists = queryClient.getQueriesData<PlanSummary[]>({
      queryKey: ['plans'],
    });
    queryClient.setQueriesData<PlanSummary[]>({ queryKey: ['plans'] }, (old) =>
      (old ?? []).filter((item) => item.id !== plan.id),
    );
    try {
      const shared = await planApi.share(plan.id, { updatedAt: plan.updatedAt });
      queryClient.setQueryData(queryKeys.plan(shared.id), shared);
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
              {selectedCategory ? selectedCategory.name : "전체 개인 일정"}
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
                  개인 일정
                </h2>
                <p className="text-sm text-stone-500">
                  카테고리로 정리하고, 함께 볼 일정은 커플 플랜으로 이동하세요.
                </p>
              </div>
              {!workspace && !workspaceLoading && (
                <PrimaryButton asChild variant="outline" size="sm">
                  <Link href="/workspace/settings">공유설정</Link>
                </PrimaryButton>
              )}
            </div>

            <PlanHistory
              plans={plans}
              loading={plansLoading}
              onDeletePlan={handleDeletePlan}
              onSharePlan={handleSharePlan}
              showWorkspaceBadge={false}
              shareDisabled={!workspace}
              shareDisabledLabel={workspaceLoading ? "확인 중" : "공유설정 필요"}
              emptyState={
                <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-5 py-8 text-center text-sm text-stone-500">
                  아직 보관된 개인 일정이 없습니다.
                </div>
              }
            />
          </AppCard>
        </div>
      </main>
    </div>
  );
}
