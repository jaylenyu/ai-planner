"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { usePlanList } from "@/hooks/usePlanList";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { categoryApi, planApi } from "@/lib/api";
import { PlanHistory } from "@/components/plan/PlanHistory";
import { NotificationBell } from "@/components/notification/NotificationBell";

export default function LibraryPage() {
  const { isLoggedIn, logout } = useAuth();
  const {
    plans,
    loading: plansLoading,
    refetch: refetchPlans,
    categoryId,
    setCategoryId,
    scope,
    setScope,
  } = usePlanList();
  const {
    categories,
    loading: categoriesLoading,
    refetch: refetchCategories,
  } = useCategories();
  const [categoryName, setCategoryName] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const handleCreateCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await categoryApi.create({ name });
      setCategoryName("");
      await refetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    await planApi.delete(planId);
    await refetchPlans();
  };

  const handleChangeCategory = async (
    planId: string,
    nextCategoryId: string | null,
  ) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;
    await planApi.update(planId, {
      updatedAt: plan.updatedAt,
      categoryId: nextCategoryId,
    });
    await refetchPlans();
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header
        className="sticky top-0 z-40 glass"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "var(--gradient-brand)",
                boxShadow: "var(--shadow-brand)",
              }}
            >
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                보관함
              </p>
              <p
                className="text-[11px] -mt-0.5 font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                카테고리로 일정 관리
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isLoggedIn && <NotificationBell />}
            <PrimaryButton asChild variant="outline" size="sm">
              <Link href="/workspace">워크스페이스</Link>
            </PrimaryButton>
            <PrimaryButton asChild variant="outline" size="sm">
              <Link href="/subscribe">구독</Link>
            </PrimaryButton>
            {isLoggedIn ? (
              <PrimaryButton
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
              >
                로그아웃
              </PrimaryButton>
            ) : (
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href="/login">로그인</Link>
              </PrimaryButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AppCard padding="md" className="h-fit">
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
                loading={saving}
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-800">
                  {scope === "shared" ? "공유 일정" : scope === "personal" ? "개인 일정" : "전체 일정"}
                </h2>
                <p className="text-sm text-stone-500">
                  삭제와 분류는 무료 플랜에서도 가능합니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl border border-stone-200 bg-white p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setScope(undefined)}
                    className={`rounded-lg px-3 py-1.5 ${scope === undefined ? "bg-orange-50 text-orange-700" : "text-stone-600"}`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("personal")}
                    className={`rounded-lg px-3 py-1.5 ${scope === "personal" ? "bg-orange-50 text-orange-700" : "text-stone-600"}`}
                  >
                    개인
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("shared")}
                    className={`rounded-lg px-3 py-1.5 ${scope === "shared" ? "bg-orange-50 text-orange-700" : "text-stone-600"}`}
                  >
                    공유
                  </button>
                </div>
                <PrimaryButton asChild variant="outline" size="sm">
                  <Link href="/plan">새 일정 생성</Link>
                </PrimaryButton>
              </div>
            </div>

            <PlanHistory
              plans={plans}
              loading={plansLoading}
              categories={categories}
              onDeletePlan={handleDeletePlan}
              onChangeCategory={handleChangeCategory}
            />
          </AppCard>
        </div>
      </main>
    </div>
  );
}
