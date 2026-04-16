"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Crown,
  HeartHandshake,
  Library,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlanList } from "@/hooks/usePlanList";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { PlanMode } from "@/lib/types";

const MODE_OPTIONS: { value: PlanMode; label: string }[] = [
  { value: "date", label: "데이트" },
  { value: "trip", label: "여행" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { workspace, role, loading: workspaceLoading } = useWorkspace();
  const { status, loading: subscriptionLoading } = useSubscriptionStatus();
  const { plans, loading: plansLoading } = usePlanList();
  const {
    items: notifications,
    unreadCount,
    loading: notificationsLoading,
  } = useNotifications();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<PlanMode>("date");

  const sharedPlans = useMemo(
    () => plans.filter((plan) => !!plan.workspace),
    [plans],
  );
  const recentPlans = useMemo(() => plans.slice(0, 3), [plans]);
  const latestNotifications = useMemo(
    () => notifications.slice(0, 3),
    [notifications],
  );
  const memberCount = workspace?.members.length ?? 0;

  const workspaceCard = useMemo(() => {
    if (!workspace) {
      return {
        title: "파트너와 아직 연결되지 않았어요",
        body: status?.hasAccess
          ? "워크스페이스를 만들고 파트너를 초대하면 공유 일정과 메모를 함께 관리할 수 있습니다."
          : "구독을 활성화하면 파트너 초대와 공유 일정 기능을 사용할 수 있습니다.",
        ctaHref: status?.hasAccess ? "/workspace" : "/subscribe",
        ctaLabel: status?.hasAccess
          ? "워크스페이스 만들기"
          : "구독하고 시작하기",
      };
    }

    if (memberCount < 2) {
      return {
        title: `${workspace.name}에 파트너를 기다리는 중이에요`,
        body: "초대 링크를 보내면 상대가 바로 합류할 수 있습니다. 연결되면 공유 일정과 메모 기능이 열립니다.",
        ctaHref: "/workspace",
        ctaLabel: "초대 상태 확인",
      };
    }

    return {
      title: "파트너 연결이 완료됐어요",
      body: `${workspace.name} 워크스페이스에서 일정과 메모를 함께 관리할 수 있습니다. 현재 멤버 ${memberCount}명 · 내 역할 ${role ?? "member"}`,
      ctaHref: "/workspace",
      ctaLabel: "워크스페이스 열기",
    };
  }, [workspace, memberCount, role, status?.hasAccess]);

  const subscriptionLabel = status?.subscription.status ?? "inactive";

  const handleQuickCreate = () => {
    const query = new URLSearchParams({
      draft: draft.trim(),
      mode,
      source: "dashboard",
      autoGenerate: "1",
    });
    router.push(`/plan?${query.toString()}`, { scroll: true });
  };

  const handleQuickCreateKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    handleQuickCreate();
  };

  return (
    <div className="bg-[var(--background)]">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-orange-600">Dashboard</p>
            <h1 className="text-3xl font-bold text-stone-900">
              오늘의 일정 허브
            </h1>
            <p className="break-keep text-sm leading-6 text-stone-600">
              파트너 연결 상태와 최근 일정, 구독 상태를 한 번에 보고 바로 새
              일정을 시작할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <AppCard
              padding="lg"
              className="flex h-full flex-col justify-between space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    파트너 / 워크스페이스
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900">
                    {workspaceCard.title}
                  </h2>
                  <p className="break-keep text-sm leading-6 text-stone-600">
                    {workspaceLoading
                      ? "워크스페이스 상태를 확인하는 중..."
                      : workspaceCard.body}
                  </p>
                </div>
                <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 sm:flex">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryButton asChild variant="brand" size="sm">
                  <Link href={workspaceCard.ctaHref}>
                    {workspaceCard.ctaLabel}
                  </Link>
                </PrimaryButton>
                <PrimaryButton asChild variant="outline" size="sm">
                  <Link href="/library">보관함 보기</Link>
                </PrimaryButton>
              </div>
            </AppCard>

            <AppCard
              padding="lg"
              className="flex h-full flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500" />
                    <h2 className="text-lg font-bold text-stone-900">
                      구독 상태
                    </h2>
                  </div>
                </div>
                {subscriptionLoading ? (
                  <p className="text-sm text-stone-500">
                    구독 상태를 확인하는 중...
                  </p>
                ) : (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                    <p className="font-semibold text-stone-900">
                      현재 상태: {subscriptionLabel}
                    </p>
                    <p className="mt-1 break-keep">
                      {status?.hasAccess
                        ? "공유 일정과 파트너 기능을 사용할 수 있습니다."
                        : "구독을 활성화하면 파트너 초대와 공유 일정 기능이 열립니다."}
                    </p>
                    <p className="mt-1 text-stone-500">
                      월 구독료:{" "}
                      {status?.monthlyAmount?.toLocaleString?.() ?? "9,900"}원
                    </p>
                  </div>
                )}
              </div>

              <PrimaryButton
                asChild
                variant={status?.hasAccess ? "outline" : "brand"}
                size="sm"
              >
                <Link href="/subscribe">
                  {status?.hasAccess ? "구독 관리" : "구독 시작하기"}
                </Link>
              </PrimaryButton>
            </AppCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <AppCard padding="lg" className="space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    빠른 일정 만들기
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">
                    아이디어를 바로 이어서 시작하세요
                  </h2>
                  <p className="break-keep text-sm leading-6 text-stone-600">
                    한 줄 입력만 남기면 바로 이어서 세부 조정과 생성까지 할 수
                    있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                        mode === option.value
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-stone-200 bg-white text-stone-600 hover:border-orange-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleQuickCreateKeyDown}
                  placeholder="예: 성수에서 저녁 먹고 카페 갔다가 산책하는 데이트 코스 짜줘"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />

                <div className="flex flex-wrap gap-3">
                  <PrimaryButton
                    type="button"
                    variant="brand"
                    size="sm"
                    disabled={!draft.trim()}
                    onClick={handleQuickCreate}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    일정 만들기
                  </PrimaryButton>
                  <PrimaryButton
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                  >
                    <Link href="/plan" scroll>
                      고급 입력으로 이동
                    </Link>
                  </PrimaryButton>
                </div>
              </AppCard>
            </div>

            <div className="space-y-6">
              <AppCard padding="lg" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-orange-500" />
                  <h2 className="text-lg font-bold text-stone-900">
                    보관함 요약
                  </h2>
                </div>
                {plansLoading ? (
                  <p className="text-sm text-stone-500">
                    일정을 불러오는 중...
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-stone-50 px-4 py-4 text-center">
                        <p className="text-xs font-semibold text-stone-500">
                          전체
                        </p>
                        <p className="mt-1 text-2xl font-bold text-stone-900">
                          {plans.length}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-stone-50 px-4 py-4 text-center">
                        <p className="text-xs font-semibold text-stone-500">
                          공유
                        </p>
                        <p className="mt-1 text-2xl font-bold text-stone-900">
                          {sharedPlans.length}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-stone-50 px-4 py-4 text-center">
                        <p className="text-xs font-semibold text-stone-500">
                          최근
                        </p>
                        <p className="mt-1 text-2xl font-bold text-stone-900">
                          {recentPlans.length}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {recentPlans.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-stone-500">
                          아직 저장된 일정이 없습니다. 첫 일정을 만들어 보세요.
                        </div>
                      ) : (
                        recentPlans.map((plan) => (
                          <Link
                            key={plan.id}
                            href={`/library/plans/${plan.id}`}
                            className="block rounded-2xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-orange-200"
                          >
                            <p className="text-sm font-semibold text-stone-900">
                              {plan.summary ?? plan.rawInput}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {new Date(plan.createdAt).toLocaleDateString(
                                "ko-KR",
                              )}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                    <PrimaryButton asChild variant="outline" size="sm">
                      <Link href="/library">보관함으로 이동</Link>
                    </PrimaryButton>
                  </>
                )}
              </AppCard>

              <AppCard padding="lg" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  <h2 className="text-lg font-bold text-stone-900">
                    최근 활동
                  </h2>
                </div>
                {notificationsLoading ? (
                  <p className="text-sm text-stone-500">
                    알림을 확인하는 중...
                  </p>
                ) : (
                  <>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                      <p className="font-semibold text-stone-900">
                        읽지 않은 알림 {unreadCount}건
                      </p>
                      <p className="mt-1 text-stone-500">
                        공유 일정과 워크스페이스 변경사항을 빠르게 확인하세요.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {latestNotifications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-stone-500">
                          새 알림이 없습니다.
                        </div>
                      ) : (
                        latestNotifications.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-stone-900">
                              {item.type}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {new Date(item.createdAt).toLocaleString("ko-KR")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <PrimaryButton asChild variant="outline" size="sm">
                      <Link href="/workspace">워크스페이스로 이동</Link>
                    </PrimaryButton>
                  </>
                )}
              </AppCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
