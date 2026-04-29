"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PlanInputForm } from "@/components/plan/PlanInputForm";
import { ScheduleList } from "@/components/plan/ScheduleList";
import { ScheduleSkeleton } from "@/components/plan/ScheduleSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { usePlanGenerate } from "@/hooks/usePlanGenerate";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { queryKeys } from "@/lib/query";
import type { PlanItem } from "@/lib/types";
import Link from "next/link";
import { Check, Heart, Lock, Save } from "lucide-react";

const MapView = dynamic(
  () => import("@/components/plan/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[300px] sm:h-[400px] items-center justify-center rounded-[var(--radius-lg)]"
        style={{ background: "var(--surface-sunken)" }}
      >
        <Spinner size="md" />
      </div>
    ),
  },
);

const PlaceMapDialog = dynamic(
  () =>
    import("@/components/plan/PlaceMapDialog").then((m) => m.PlaceMapDialog),
  { ssr: false },
);

function PlanPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    generate,
    save,
    status,
    result,
    saveStatus,
    saveError,
    error,
    dailyLimitError,
  } =
    usePlanGenerate();
  const { isLoggedIn } = useAuth();
  const { workspace } = useWorkspace();
  const resultsRef = useRef<HTMLElement>(null); // 결과 섹션 참조
  const [selectedPlace, setSelectedPlace] = useState<PlanItem | null>(null);
  const draft = searchParams.get("draft") ?? "";
  const initialMode = searchParams.get("mode") === "trip" ? "trip" : "date";
  const shouldAutoGenerate = searchParams.get("autoGenerate") === "1";
  const autoGenerateKeyRef = useRef<string | null>(null);

  const handleSubmit = useCallback(
    async (rawInput: string, mode: "date" | "trip") => {
      if (!isLoggedIn) return;
      await generate(rawInput, mode);
    },
    [generate, isLoggedIn],
  );

  const handleSave = useCallback(
    async (scope: "personal" | "shared") => {
      if (!result || !("draftId" in result)) return;
      const saved = await save(
        result.draftId,
        scope,
        scope === "shared" ? workspace?.id : undefined,
      );
      if (!saved) return;
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMine,
      });
    },
    [queryClient, result, save, workspace?.id],
  );

  useEffect(() => {
    if (!isLoggedIn || !shouldAutoGenerate || !draft.trim()) {
      return;
    }

    const autoKey = `${initialMode}:${draft.trim()}`;
    if (autoGenerateKeyRef.current === autoKey) {
      return;
    }

    autoGenerateKeyRef.current = autoKey;
    void handleSubmit(draft.trim(), initialMode);
  }, [draft, handleSubmit, initialMode, isLoggedIn, shouldAutoGenerate]);

  const renderResultsPanel = () => {
    if (status === "loading") {
      return (
        <section className="animate-fade-in">
          <div className="flex items-center justify-center gap-3 py-5">
            <div className="relative">
              <Spinner size="md" />
              <div className="absolute inset-0 rounded-full bg-orange-500/10 animate-ping" />
            </div>
            <p className="text-sm font-semibold text-stone-700">
              AI가 최적 일정을 설계하고 있어요
            </p>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs animate-pulse-soft"
              style={{
                background: "var(--surface-sunken)",
                borderColor: "var(--border-light)",
                color: "var(--text-secondary)",
              }}
            >
              📍 장소 탐색
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
          <ScheduleSkeleton />
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
          <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
                <Check className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-stone-800">
                일정이 완성됐어요!
              </h2>
            </div>
            {"planId" in result && (
              <PrimaryButton
                asChild
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Link href={result.workspace ? "/workspace" : "/library"}>
                  {result.workspace ? "커플 플랜으로 가기" : "보관함으로 가기"}
                </Link>
              </PrimaryButton>
            )}
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
          {"draftId" in result && (
            <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    이 일정을 어디에 저장할까요?
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    저장하기 전까지는 보관함이나 커플 플랜에 추가되지 않습니다.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <PrimaryButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    loading={saveStatus === "saving"}
                    disabled={saveStatus === "saving"}
                    onClick={() => void handleSave("personal")}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    개인 플랜에 저장
                  </PrimaryButton>
                  <PrimaryButton
                    type="button"
                    variant="brand"
                    size="sm"
                    className="w-full sm:w-auto"
                    loading={saveStatus === "saving"}
                    disabled={saveStatus === "saving" || !workspace}
                    onClick={() => void handleSave("shared")}
                  >
                    {workspace ? (
                      <Heart className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    )}
                    커플 플랜에 저장
                  </PrimaryButton>
                </div>
              </div>
              {!workspace && (
                <p className="mt-3 text-xs text-stone-500">
                  커플 플랜 저장은 구독 후 사용할 수 있습니다.
                </p>
              )}
              {saveError && (
                <p className="mt-3 text-xs font-medium text-red-600">
                  {saveError}
                </p>
              )}
            </div>
          )}
          {"workspace" in result && result.workspace && (
            <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm text-violet-800">
              이 일정은 <strong>{result.workspace.name}</strong> 커플 플랜에
              공유되었습니다.
            </div>
          )}

          <div className="my-6 h-px bg-stone-100" />

          <div className="my-5 flex items-center gap-2">
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

          <div className="my-6 h-px bg-stone-100" />

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
    <div className="bg-[var(--background)] overflow-x-clip">
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
          className="grid grid-cols-1 gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start"
        >
          {/* Input panel */}
          <div className="min-w-0 lg:sticky lg:top-20">
            <AppCard padding="lg" className="min-w-0 hero-pattern">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
                  오늘 하루,{" "}
                  <span className="text-gradient">어디로 갈까요?</span>
                </h2>
                <p className="mt-2 text-sm text-stone-500 sm:text-base">
                  자연어 한마디면 AI가 완벽한 일정을 만들어드려요
                </p>
              </div>
              <PlanInputForm
                key={`${draft}:${initialMode}`}
                onSubmit={handleSubmit}
                loading={status === "loading"}
                initialRawInput={draft}
                initialMode={initialMode}
              />
            </AppCard>
          </div>

          {/* Results panel */}
          <AppCard padding="lg" className="min-w-0">
            {renderResultsPanel()}
          </AppCard>
        </section>
      </main>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanPageContent />
    </Suspense>
  );
}
