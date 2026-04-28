'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminPlanListResponse, AdminWorkspaceListResponse } from '@/lib/types';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { AdminSectionCard } from '../_components/AdminSectionCard';

const PAGE_SIZE = 10;

function BarChart({ value, max }: { value: number; max: number }) {
  const width = max === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
  return (
    <div className="h-3 rounded-full bg-stone-100">
      <div className="h-3 rounded-full bg-[var(--brand-500)]" style={{ width: `${width}%` }} />
    </div>
  );
}

function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  loadedCount,
  total,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadedCount: number;
  total: number;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore]);

  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      {isFetchingNextPage ? (
        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
      ) : hasNextPage ? (
        <span className="text-xs text-stone-400">스크롤하면 더 불러옵니다</span>
      ) : loadedCount > 0 ? (
        <span className="text-xs text-stone-400">총 {total}개 모두 표시됨</span>
      ) : null}
    </div>
  );
}

export default function AdminPlansPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin', 'plans', 'overview'],
    queryFn: () => adminApi.plans(),
  });

  const plansQuery = useInfiniteQuery({
    queryKey: ['admin', 'plans', 'list'],
    queryFn: ({ pageParam }) => adminApi.plansList(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage as AdminPlanListResponse;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const workspacesQuery = useInfiniteQuery({
    queryKey: ['admin', 'workspaces', 'list'],
    queryFn: ({ pageParam }) => adminApi.workspacesList(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage as AdminWorkspaceListResponse;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const plans = plansQuery.data?.pages.flatMap((p) => (p as AdminPlanListResponse).items) ?? [];
  const plansTotal = (plansQuery.data?.pages[0] as AdminPlanListResponse | undefined)?.total ?? 0;

  const workspaces = workspacesQuery.data?.pages.flatMap((p) => (p as AdminWorkspaceListResponse).items) ?? [];
  const workspacesTotal = (workspacesQuery.data?.pages[0] as AdminWorkspaceListResponse | undefined)?.total ?? 0;

  const loadMorePlans = useCallback(() => {
    if (plansQuery.hasNextPage && !plansQuery.isFetchingNextPage) {
      void plansQuery.fetchNextPage();
    }
  }, [plansQuery]);

  const loadMoreWorkspaces = useCallback(() => {
    if (workspacesQuery.hasNextPage && !workspacesQuery.isFetchingNextPage) {
      void workspacesQuery.fetchNextPage();
    }
  }, [workspacesQuery]);

  const max = Math.max(
    overviewQuery.data?.timeline.daily ?? 0,
    overviewQuery.data?.timeline.weekly ?? 0,
    overviewQuery.data?.timeline.monthly ?? 0,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="플랜"
        title="Plan / Workspace 모니터링"
        description="생성량 추이, 이상 생성 패턴, 워크스페이스 상태를 살핍니다."
      />

      <AdminSectionCard
        title="생성 추이"
        description="일·주·월 단위 생성량을 상대 비교로 보여줍니다."
      >
        <div className="space-y-4">
          {[
            ['일', overviewQuery.data?.timeline.daily ?? 0],
            ['주', overviewQuery.data?.timeline.weekly ?? 0],
            ['월', overviewQuery.data?.timeline.monthly ?? 0],
          ].map(([label, value]) => (
            <div key={label as string} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-700">{label}</span>
                <span className="text-stone-500">{value as number}</span>
              </div>
              <BarChart value={value as number} max={max} />
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="이상 탐지"
          description="24시간 내 대량 생성 사용자를 경고 리스트로 분리합니다."
        >
          {overviewQuery.data?.suspiciousUsers.length ? (
            <div className="space-y-3">
              {overviewQuery.data.suspiciousUsers.map((item) => (
                <div key={item.userId} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-amber-900">{item.user.email}</p>
                  <p className="mt-1 text-amber-800">24h 생성 수 {item.count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">최근 24시간 기준 경고 대상이 없습니다.</p>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title={`워크스페이스 목록 (${workspacesTotal}개)`}
          description="워크스페이스의 소유자와 멤버 수를 보여줍니다."
        >
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-stone-900">{workspace.name}</p>
                <p className="mt-1 text-stone-600">
                  소유자 {workspace.owner.email} · 멤버 {workspace._count.members}명 · 플랜 {workspace._count.plans}개
                </p>
              </div>
            ))}
          </div>
          <InfiniteScrollSentinel
            hasNextPage={workspacesQuery.hasNextPage}
            isFetchingNextPage={workspacesQuery.isFetchingNextPage}
            loadedCount={workspaces.length}
            total={workspacesTotal}
            onLoadMore={loadMoreWorkspaces}
          />
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title={`Plan 목록 (${plansTotal}개)`}
        description="최근 생성된 플랜과 공유 여부를 확인합니다."
      >
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <p className="font-semibold text-stone-900">{plan.summary ?? plan.rawInput}</p>
              <p className="mt-1 text-stone-600">
                {plan.workspace ? `${plan.workspace.name} 공유` : '개인'} · {plan.user.email}
              </p>
            </div>
          ))}
        </div>
        <InfiniteScrollSentinel
          hasNextPage={plansQuery.hasNextPage}
          isFetchingNextPage={plansQuery.isFetchingNextPage}
          loadedCount={plans.length}
          total={plansTotal}
          onLoadMore={loadMorePlans}
        />
      </AdminSectionCard>
    </div>
  );
}
