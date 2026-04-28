'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { PrimaryButton } from '@/components/ui/primary-button';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminSectionCard } from '../../_components/AdminSectionCard';

const PALETTE = [
  '#e07b39', '#f5a623', '#4a90d9', '#7ed321', '#9b59b6',
  '#1abc9c', '#e74c3c', '#3498db', '#f39c12', '#2ecc71',
];

function dollarTick(v: unknown) {
  return `$${Number(v).toFixed(2)}`;
}

function CostTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-stone-700">{name}</p>
      <p className="font-mono text-stone-900">${value.toFixed(2)}</p>
    </div>
  );
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

  const chartData = Object.entries(query.data?.byService ?? {})
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }));

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
        <div>
          <p className="text-sm text-stone-500">월 누적</p>
          <p className="text-3xl font-bold text-stone-900">${(query.data?.monthly ?? 0).toFixed(2)}</p>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="서비스별 분해"
        description="비용 비중이 높은 영역을 빠르게 확인합니다."
      >
        {chartData.length === 0 ? (
          <p className="text-sm text-stone-400">표시할 비용 데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis tickFormatter={dollarTick} tick={{ fontSize: 11, fill: '#78716c' }} width={56} />
              <Tooltip content={<CostTooltip />} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </AdminSectionCard>
    </div>
  );
}
