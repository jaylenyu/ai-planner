"use client";

import { useRef, useCallback, useState } from "react";
import { PlanInputForm } from "@/components/plan/PlanInputForm";
import { ScheduleList } from "@/components/plan/ScheduleList";
import { MapView } from "@/components/plan/MapView";
import { PlanHistory } from "@/components/plan/PlanHistory";
import { PlaceMapDialog } from "@/components/plan/PlaceMapDialog";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { Spinner } from "@/components/ui/Spinner";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { usePlanGenerate } from "@/hooks/usePlanGenerate";
import { usePlanList } from "@/hooks/usePlanList";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { PlanItem } from "@/lib/types";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

export default function PlanPage() {
  const { generate, status, result, error, dailyLimitError } =
    usePlanGenerate();
  const { isLoggedIn, logout } = useAuth();
  const { plans, loading: plansLoading, refetch } = usePlanList();
  const { workspace } = useWorkspace();
  const resultsRef = useRef<HTMLElement>(null); // 결과 섹션 참조
  const [selectedPlace, setSelectedPlace] = useState<PlanItem | null>(null);
  const [saveToWorkspace, setSaveToWorkspace] = useState(false);

  const scrollToResults = useCallback(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSubmit = async (rawInput: string, mode: "date" | "trip") => {
    if (!isLoggedIn) return;
    await generate(
      rawInput,
      mode,
      saveToWorkspace && workspace ? workspace.id : undefined,
    );
    refetch();
  };

  const renderResultsPanel = () => {
    if (status === "loading") {
      return (
        <section className="flex min-h-[260px] flex-col items-center justify-center gap-5 py-10 animate-fade-in">
          <div className="relative">
            <Spinner size="lg" />
            <div className="absolute inset-0 rounded-full bg-orange-500/10 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-stone-700">
              AI가 최적 일정을 설계하고 있어요
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs animate-pulse-soft"
                style={{
                  background: "var(--surface-sunken)",
                  borderColor: "var(--border-light)",
                  color: "var(--text-secondary)",
                }}
              >
                📍 장소 탐색 중
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs animate-pulse-soft"
                style={{
                  background: "var(--surface-sunken)",
                  borderColor: "var(--border-light)",
                  color: "var(--text-secondary)",
                  animationDelay: "0.5s",
                }}
              >
                🗺 동선 최적화
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs animate-pulse-soft"
                style={{
                  background: "var(--surface-sunken)",
                  borderColor: "var(--border-light)",
                  color: "var(--text-secondary)",
                  animationDelay: "1s",
                }}
              >
                ⏰ 시간표 생성
              </span>
            </div>
          </div>
        </section>
      );
    }

    if (status === "error" && error) {
      return (
        <section className="py-2 animate-fade-in">
          {dailyLimitError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <span className="text-xl">⏳</span>
                <div>
                  <p className="font-semibold">
                    오늘 AI 사용량이 모두 소진되었어요
                  </p>
                  <p className="mt-1 text-amber-800">
                    오늘 사용량 {dailyLimitError.used}회로 일일 제한{" "}
                    {dailyLimitError.limit}회에 도달했습니다.
                  </p>
                  <p className="mt-1 text-amber-700">
                    새로운 일정 생성은 내일 다시 이용할 수 있어요.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">오류가 발생했어요</p>
                <p className="mt-0.5 text-red-600">{error}</p>
              </div>
            </div>
          )}
        </section>
      );
    }

    if (status === "success" && result) {
      return (
        <section ref={resultsRef} className="animate-fade-in-up">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-stone-800">
              일정이 완성됐어요!
            </h2>
          </div>
          {result.unsupportedHints.length > 0 && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              <p className="font-semibold">아직 반영되지 않은 조건이 있어요</p>
              <ul className="mt-2 flex flex-col gap-1 text-amber-800">
                {result.unsupportedHints.map((hint) => (
                  <li key={hint}>- {hint}</li>
                ))}
              </ul>
            </div>
          )}
          {result.workspace && (
            <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm text-violet-800">
              이 일정은 <strong>{result.workspace.name}</strong> 워크스페이스에
              공유되었습니다.
            </div>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            <AppCard padding="md" className="h-full">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  📋
                </span>
                <h3
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  일정 상세
                </h3>
              </div>
              <ScheduleList
                items={result.items}
                summary={result.summary}
                totalDurationMin={result.totalDurationMin}
                onOpenPlace={setSelectedPlace}
              />
            </AppCard>
            <AppCard padding="md" className="h-full overflow-hidden">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  🗺
                </span>
                <h3
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  경로 지도
                </h3>
              </div>
              <MapView items={result.items} polyline={result.polyline} />
            </AppCard>
          </div>
        </section>
      );
    }

    return (
      <section className="flex min-h-[260px] flex-col items-center justify-center gap-4 py-10 text-center animate-fade-in">
        <div className="text-5xl animate-pulse-soft">🗓</div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-stone-600">
            왼쪽에서 일정을 입력하면 여기에 결과가 나타나요
          </p>
          <p className="text-sm text-stone-400">
            데이트 코스부터 당일치기 여행까지 AI가 설계해드려요
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-clip">
      {/* Header */}
      <header
        className="sticky top-0 z-50 glass"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <AppLogo size="md" showSubtitle />
          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <PrimaryButton
                asChild
                variant="brand"
                size="sm"
                className="sm:hidden"
              >
                <Link href="/login">로그인</Link>
              </PrimaryButton>
            ) : (
              <PrimaryButton
                variant="outline"
                size="sm"
                className="sm:hidden"
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
              >
                로그아웃
              </PrimaryButton>
            )}

            <div className="hidden items-center gap-2 sm:flex">
              {isLoggedIn && <NotificationBell />}
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href="/library">보관함</Link>
              </PrimaryButton>
              {isLoggedIn && (
                <PrimaryButton asChild variant="outline" size="sm">
                  <Link href="/workspace">워크스페이스</Link>
                </PrimaryButton>
              )}
              {isLoggedIn && (
                <PrimaryButton asChild variant="outline" size="sm">
                  <Link href="/subscribe">구독</Link>
                </PrimaryButton>
              )}
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
                <div className="flex gap-2">
                  <PrimaryButton asChild variant="outline" size="sm">
                    <Link href="/login">로그인</Link>
                  </PrimaryButton>
                  <PrimaryButton asChild variant="brand" size="sm">
                    <Link href="/register">시작하기</Link>
                  </PrimaryButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <PlaceMapDialog
        open={!!selectedPlace}
        item={selectedPlace}
        onOpenChange={(open) => {
          if (!open) setSelectedPlace(null);
        }}
      />
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section
          ref={resultsRef}
          className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-start"
        >
          {/* Input panel */}
          <AppCard
            padding="lg"
            className="min-w-0 hero-pattern lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
          >
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
                오늘 하루, <span className="text-gradient">어디로 갈까요?</span>
              </h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">
                자연어 한마디면 AI가 완벽한 일정을 만들어드려요
              </p>
            </div>
            {!isLoggedIn && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 animate-fade-in">
                <span className="text-xl">🔒</span>
                <span>
                  일정을 생성하려면{" "}
                  <Link
                    href="/login"
                    className="font-bold underline underline-offset-2 transition-colors hover:text-amber-800"
                  >
                    로그인
                  </Link>
                  이 필요합니다.
                </span>
              </div>
            )}
            <PlanInputForm
              onSubmit={handleSubmit}
              loading={status === "loading"}
              scrollToResults={scrollToResults}
              shareEnabled={!!workspace}
              saveToWorkspace={saveToWorkspace}
              workspaceName={workspace?.name}
              onChangeSaveToWorkspace={setSaveToWorkspace}
            />
          </AppCard>

          {/* Results panel */}
          <AppCard
            padding="lg"
            className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
          >
            {renderResultsPanel()}
          </AppCard>
        </section>
        {/* History */}
        {isLoggedIn && (
          <section className="py-8 border-t border-stone-100">
            <PlanHistory plans={plans} loading={plansLoading} />
          </section>
        )}
      </main>
      {/* Footer */}
      <footer className="mt-auto border-t border-stone-100 py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-stone-400">DatePlanner © 2026</p>
          <p className="text-xs text-stone-400">Powered by AI</p>
        </div>
      </footer>
    </div>
  );
}
