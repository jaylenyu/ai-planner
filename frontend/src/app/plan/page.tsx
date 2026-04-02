'use client';

import { useState } from 'react';
import { PlanInputForm } from '../../components/plan/PlanInputForm';
import { ScheduleList } from '../../components/plan/ScheduleList';
import { MapView } from '../../components/plan/MapView';
import { Spinner } from '../../components/ui/Spinner';
import { usePlanGenerate } from '../../hooks/usePlanGenerate';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

export default function PlanPage() {
  const { generate, status, result, error } = usePlanGenerate();
  const { isLoggedIn } = useAuth();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (rawInput: string, mode: 'date' | 'trip') => {
    if (!isLoggedIn) return;
    setHasSubmitted(true);
    await generate(rawInput, mode);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">AI 일정 플래너</h1>
            <p className="text-xs text-zinc-400">자연어로 입력하면 AI가 최적 동선을 생성합니다</p>
          </div>
          <div className="flex gap-2">
            {isLoggedIn ? (
              <span className="text-xs text-zinc-500">로그인됨</span>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  로그인
                </Link>
                <Link href="/register" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* 입력 폼 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 mb-6">
          {!isLoggedIn && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              일정을 생성하려면 <Link href="/login" className="font-semibold underline">로그인</Link>이 필요합니다.
            </div>
          )}
          <PlanInputForm onSubmit={handleSubmit} loading={status === 'loading'} />
        </div>

        {/* 로딩 */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Spinner size="lg" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">AI가 최적 일정을 생성하고 있습니다</p>
              <p className="text-xs text-zinc-400 mt-1">장소 검색 → 동선 최적화 → 시간표 생성</p>
            </div>
          </div>
        )}

        {/* 에러 */}
        {status === 'error' && error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">오류:</span> {error}
          </div>
        )}

        {/* 결과 */}
        {status === 'success' && result && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100">
              <h2 className="mb-4 text-base font-semibold text-zinc-800">📋 일정</h2>
              <ScheduleList
                items={result.items}
                summary={result.summary}
                totalDurationMin={result.totalDurationMin}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100">
              <h2 className="mb-4 text-base font-semibold text-zinc-800">🗺 지도</h2>
              <MapView items={result.items} polyline={result.polyline} />
            </div>
          </div>
        )}

        {/* 초기 상태 */}
        {!hasSubmitted && status === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="text-4xl">🗓</div>
            <p className="text-sm font-medium text-zinc-600">위에 원하는 일정을 입력해보세요</p>
            <p className="text-xs text-zinc-400">데이트 코스, 당일치기 여행 모두 지원합니다</p>
          </div>
        )}
      </main>
    </div>
  );
}
