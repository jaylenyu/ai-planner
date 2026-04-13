'use client';

import { useState } from 'react';
import { PlanInputForm } from '@/components/plan/PlanInputForm';
import { ScheduleList } from '@/components/plan/ScheduleList';
import { MapView } from '@/components/plan/MapView';
import { PlanHistory } from '@/components/plan/PlanHistory';
import { Spinner } from '@/components/ui/Spinner';
import { usePlanGenerate } from '@/hooks/usePlanGenerate';
import { usePlanList } from '@/hooks/usePlanList';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function PlanPage() {
  const { generate, status, result, error } = usePlanGenerate();
  const { isLoggedIn, logout } = useAuth();
  const { plans, loading: plansLoading, refetch } = usePlanList();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (rawInput: string, mode: 'date' | 'trip') => {
    if (!isLoggedIn) return;
    setHasSubmitted(true);
    await generate(rawInput, mode);
    refetch();
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-stone-200/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/plan" className="flex items-center gap-2.5 group">
             <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-orange-500 shadow-md shadow-orange-500/20 group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">Dayplan</h1>
              <p className="text-[11px] text-stone-400 -mt-0.5 font-medium">AI 일정 플래너</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <button
                onClick={() => { logout(); window.location.href = '/login'; }}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 cursor-pointer"
              >
                로그아웃
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all duration-200"
                >
                  로그인
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-orange-600 transition-all duration-200"
                >
                  시작하기
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero input section */}
        <section className="relative py-8 sm:py-12">
          <div className="hero-pattern rounded-3xl p-6 sm:p-10 border border-stone-100 bg-white/60">
            {/* Title area */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                오늘 하루,{' '}
                <span className="text-gradient">어디로 갈까요?</span>
              </h2>
              <p className="mt-2 text-sm sm:text-base text-stone-500">
                자연어 한마디면 AI가 완벽한 일정을 만들어드려요
              </p>
            </div>

            {!isLoggedIn && (
              <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-700 flex items-center gap-3 animate-fade-in">
                <span className="text-xl">🔒</span>
                <span>
                  일정을 생성하려면{' '}
                  <Link href="/login" className="font-bold underline underline-offset-2 hover:text-amber-800 transition-colors">
                    로그인
                  </Link>
                  이 필요합니다.
                </span>
              </div>
            )}

            <PlanInputForm onSubmit={handleSubmit} loading={status === 'loading'} />
          </div>
        </section>

        {/* Loading state */}
        {status === 'loading' && (
          <section className="flex flex-col items-center gap-5 py-16 animate-fade-in">
            <div className="relative">
              <Spinner size="lg" />
              <div className="absolute inset-0 rounded-full bg-orange-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-stone-700">AI가 최적 일정을 설계하고 있어요</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-500 animate-pulse-soft">
                  📍 장소 탐색 중
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-500 animate-pulse-soft" style={{ animationDelay: '0.5s' }}>
                  🗺 동선 최적화
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-500 animate-pulse-soft" style={{ animationDelay: '1s' }}>
                  ⏰ 시간표 생성
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <section className="py-4 animate-fade-in">
            <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">오류가 발생했어요</p>
                <p className="text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {status === 'success' && result && (
          <section className="pb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-stone-800">일정이 완성됐어요!</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Schedule */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-200 order-2 lg:order-1">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-lg">📋</span>
                  <h3 className="text-base font-bold text-stone-800">일정 상세</h3>
                </div>
                <ScheduleList
                  items={result.items}
                  summary={result.summary}
                  totalDurationMin={result.totalDurationMin}
                />
              </div>

              {/* Map */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-200 order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start overflow-hidden">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-lg">🗺</span>
                  <h3 className="text-base font-bold text-stone-800">경로 지도</h3>
                </div>
                <MapView items={result.items} polyline={result.polyline} />
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!hasSubmitted && status === 'idle' && (
          <section className="flex flex-col items-center gap-4 py-16 text-center animate-fade-in">
            <div className="text-6xl animate-float">🗓</div>
            <div>
              <p className="text-base font-semibold text-stone-600">원하는 일정을 입력해보세요</p>
              <p className="text-sm text-stone-400 mt-1">데이트 코스부터 당일치기 여행까지 AI가 설계해드려요</p>
            </div>
          </section>
        )}

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
          <p className="text-xs text-stone-400">Dayplan &copy; 2026</p>
          <p className="text-xs text-stone-400">Powered by AI</p>
        </div>
      </footer>
    </div>
  );
}
