'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { AdminSectionCard } from '../_components/AdminSectionCard';

function money(value: number) {
  return `₩${new Intl.NumberFormat('ko-KR').format(value)}`;
}

export default function AdminBillingPage() {
  const query = useQuery({
    queryKey: ['admin', 'billing'],
    queryFn: () => adminApi.billing(),
  });

  const statusCounts = query.data?.statusCounts ?? {};
  const subscriptions = query.data?.subscriptions ?? [];
  const payments = query.data?.payments ?? [];
  const failedPayments = query.data?.failedPayments ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="구독·결제"
        title="구독과 결제 추적"
        description="상태별 구독 현황과 실패한 결제를 빠르게 확인합니다."
      />

      <AdminSectionCard
        title="구독 상태 분포"
        description="상태별 구독자 수를 요약합니다."
      >
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="rounded-2xl bg-stone-50 px-4 py-4">
              <p className="text-xs font-semibold text-stone-500">{status}</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{count}</p>
            </div>
            ))}
        </div>
      </AdminSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="활성 구독 테이블"
          description="현재 활성 상태인 구독과 요금제를 확인합니다."
        >
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-900">{subscription.user.email}</p>
                  <span className="text-xs text-stone-500">{subscription.status}</span>
                </div>
                <p className="mt-1 text-stone-600">{subscription.planCode}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="결제 로그"
          description="실패 결제와 최근 결제 기록을 함께 제공합니다."
        >
          <div className="space-y-3">
            {failedPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{payment.user.email}</p>
                  <span>{payment.status}</span>
                </div>
                <p className="mt-1">Order {payment.orderId} · {money(payment.amount)}</p>
                <p className="mt-1 text-xs text-red-700">{payment.failReason ?? '사유 없음'}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
            <p className="font-semibold text-stone-900">최근 50건</p>
            <p className="mt-1 text-stone-500">Toss 콘솔 딥링크는 운영용 환경변수 연결 후 활성화됩니다.</p>
          </div>
          <div className="space-y-2">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-stone-900">{payment.orderId}</p>
                <p className="mt-1 text-stone-600">{payment.status} · {money(payment.amount)}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}
