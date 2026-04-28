'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { KpiCard } from '../_components/KpiCard';
import { AdminSectionCard } from '../_components/AdminSectionCard';

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatWon(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export default function AdminBoardPage() {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => adminApi.summary(),
  });

  const data = summaryQuery.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="보드"
        title="운영 대시보드"
        description="가입자, 구독, 결제, 비용, 이슈를 한 화면에서 확인합니다."
      />

      {summaryQuery.isLoading ? (
        <p className="text-sm text-stone-500">관리 지표를 불러오는 중...</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="전체 가입자" value={formatNumber(data?.kpis.totalUsers ?? 0)} />
        <KpiCard label="활성 구독자" value={formatNumber(data?.kpis.activeSubscriptions ?? 0)} />
        <KpiCard label="MRR" value={`₩${formatNumber(data?.kpis.mrr ?? 0)}`} />
        <KpiCard label="오늘 생성된 Plan" value={formatNumber(data?.kpis.plansToday ?? 0)} />
        <KpiCard label="금월 AWS 비용" value={`$${(data?.kpis.monthlyAwsCost ?? 0).toFixed(2)}`} />
        <KpiCard label="Sentry unresolved" value={formatNumber(data?.kpis.unresolvedSentryCount ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSectionCard
          title="최근 결제 실패"
          description="실패한 최근 결제를 빠르게 확인합니다."
        >
          <div className="space-y-3">
            {(data?.recentFailures ?? []).slice(0, 5).map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-900">{payment.user.email}</p>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                    {payment.status}
                  </span>
                </div>
                <p className="mt-1 text-stone-600">Order {payment.orderId} · ₩{formatWon(payment.amount)}</p>
                <p className="mt-1 text-xs text-stone-500">{payment.failReason ?? '사유 없음'}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="최근 가입자"
          description="신규 유입과 최근 접속 상태를 봅니다."
        >
          <div className="space-y-3">
            {(data?.recentUsers ?? []).slice(0, 5).map((user) => (
              <div key={user.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-900">{user.email}</p>
                  <span className="text-xs text-stone-500">{user.role}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  가입일 {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  {user.lastLoginAt ? ` · 최근 접속 ${new Date(user.lastLoginAt).toLocaleDateString('ko-KR')}` : ''}
                </p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
