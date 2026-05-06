"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/custom/PageLayout";
import { CalendarPlus, HeartHandshake, Settings, Sparkles, Users } from "lucide-react";
import { AppCard } from "@/components/custom/app-card";
import { PrimaryButton } from "@/components/custom/primary-button";
import { PlanHistory } from "@/components/plan/PlanHistory";
import { usePlanList } from "@/hooks/usePlanList";
import { useWorkspace } from "@/hooks/useWorkspace";
import { planApi } from "@/lib/api";
import type { PlanSummary } from "@/lib/types";

export default function WorkspacePage() {
  const queryClient = useQueryClient();
  const { workspace, role, loading: workspaceLoading } = useWorkspace();
  const { plans, loading: plansLoading } = usePlanList("shared");

  const handleDeletePlan = async (planId: string) => {
    const previousLists = queryClient.getQueriesData<PlanSummary[]>({
      queryKey: ["plans"],
    });
    queryClient.setQueriesData<PlanSummary[]>({ queryKey: ["plans"] }, (old) =>
      (old ?? []).filter((plan) => plan.id !== planId),
    );
    try {
      await planApi.delete(planId);
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
    } catch (error) {
      previousLists.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      throw error;
    }
  };

  const memberCount = workspace?.members.length ?? 0;
  const roleLabel =
    role === "owner" ? "플랜 오너" : role === "member" ? "파트너" : "미정";

  return (
    <PageLayout>
      <div className="space-y-6">
          <AppCard
            padding="lg"
            className="overflow-hidden border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/80"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  커플 플랜
                </div>
                <h1 className="break-keep text-3xl font-bold text-stone-900 sm:text-4xl">
                  공유 일정과 메모를 함께 확인하세요
                </h1>
                <p className="break-keep text-sm leading-6 text-stone-600">
                  보관함에서 이동한 일정과 커플 플랜으로 만든 일정을 모아 보고,
                  상세 화면에서 장소 수정과 메모 작성을 이어갑니다.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="rounded-2xl border border-violet-100 bg-white/80 px-4 py-4">
                  <div className="flex items-center gap-2 text-violet-700">
                    <Users className="h-4 w-4" />
                    <p className="text-xs font-semibold">멤버</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-stone-900">
                    {workspaceLoading ? "-" : memberCount}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{roleLabel}</p>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-white/80 px-4 py-4">
                  <div className="flex items-center gap-2 text-violet-700">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-xs font-semibold">공유 일정</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-stone-900">
                    {plansLoading ? "-" : plans.length}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {workspace?.name ?? "커플 플랜 없음"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryButton asChild variant="brand" size="sm">
                <Link href="/plan">
                  <CalendarPlus className="h-4 w-4" />
                  일정 만들기
                </Link>
              </PrimaryButton>
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href="/workspace/settings">
                  <Settings className="h-4 w-4" />
                  공유설정
                </Link>
              </PrimaryButton>
            </div>
          </AppCard>

          <AppCard padding="md">
            <PlanHistory
              plans={plans}
              loading={plansLoading || workspaceLoading}
              onDeletePlan={workspace ? handleDeletePlan : undefined}
              getPlanHref={(plan) => `/workspace/plans/${plan.id}`}
              title="공유 일정"
              variant="couple"
              showCategory={false}
              emptyState={
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 px-5 py-8 text-center text-sm text-stone-600">
                  {workspace ? (
                    <div className="space-y-3">
                      <p className="font-semibold text-stone-900">
                        아직 공유 일정이 없습니다.
                      </p>
                      <p>보관함 카드에서 개인 일정을 커플 플랜으로 이동해보세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="font-semibold text-stone-900">
                        커플 플랜이 아직 없습니다.
                      </p>
                      <p>공유설정에서 커플 플랜을 만들고 파트너를 초대하세요.</p>
                      <PrimaryButton asChild variant="outline" size="sm">
                        <Link href="/workspace/settings">공유설정으로 이동</Link>
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              }
            />
          </AppCard>
        </div>
    </PageLayout>
  );
}
