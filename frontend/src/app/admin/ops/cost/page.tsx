'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PrimaryButton } from '@/components/ui/primary-button';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminSectionCard } from '../../_components/AdminSectionCard';

function MoneyBar({ value, max }: { value: number; max: number }) {
  const width = max === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
  return <div className="h-3 rounded-full bg-[var(--brand-500)]" style={{ width: `${width}%` }} />;
}

export default function AdminCostPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'cost'],
    queryFn: () => adminApi.cost(),
  });
  const refreshMutation = useMutation({
    mutationFn: () => adminApi.cost(true),
    onSuccess: async (data) => {
      queryClient.setQueryData(['admin', 'cost'], data);
    },
  });

  const max = Math.max(...Object.values(query.data?.byService ?? { x: 0 }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="운영 모니터링 / 비용"
        title="AWS 비용"
        description="Cost Explorer가 붙기 전에는 API 사용량 기반의 비용 추정을 보여줍니다."
      />

      <AdminSectionCard
        title="월 누적 비용"
        description="Cost Explorer 설정 전에는 API 사용량 기반 추정치를 보여줍니다."
        action={
          <PrimaryButton
            type="button"
            variant="brand"
            size="sm"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            지금 새로고침
          </PrimaryButton>
        }
      >
        {query.data?.source === 'fallback' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {query.data.error ?? 'Cost Explorer 대신 API 사용량 기반 추정치를 보여줍니다.'}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">월 누적</p>
            <p className="text-3xl font-bold text-stone-900">${(query.data?.monthly ?? 0).toFixed(2)}</p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="서비스별 분해"
        description="비용 비중이 높은 영역을 빠르게 확인합니다."
      >
        <div className="space-y-4">
          {Object.entries(query.data?.byService ?? {}).map(([service, value]) => (
            <div key={service} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-700">{service}</span>
                <span className="text-stone-500">${value.toFixed(2)}</span>
              </div>
              <div className="h-3 rounded-full bg-stone-100">
                <MoneyBar value={value} max={max} />
              </div>
            </div>
            ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="최근 30일 포인트"
        description="일자별 비용 포인트를 최근 9개까지 노출합니다."
      >
        <div className="grid gap-2 md:grid-cols-3">
          {(query.data?.points ?? []).slice(-9).map((point) => (
            <div key={point.date} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <p className="text-xs text-stone-500">{point.date}</p>
              <p className="font-semibold text-stone-900">${point.cost.toFixed(3)}</p>
            </div>
            ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
