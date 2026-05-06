'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminSectionCard } from '../../_components/AdminSectionCard';

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="font-mono text-muted-foreground">
          {item.name}: {formatNumber(item.value)}
        </p>
      ))}
    </div>
  );
}

export default function AdminGa4Page() {
  const query = useQuery({
    queryKey: ['admin', 'ga4'],
    queryFn: () => adminApi.ga4(),
  });

  const data = query.data;
  const hasTrend = (data?.trend.length ?? 0) > 0;
  const hasAcquisition = (data?.acquisition.length ?? 0) > 0;
  const hasTopPages = (data?.topPages.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="운영 모니터링 / GA4"
        title="GA4 Analytics"
        description="마케팅 유입, 활성 사용자, 인기 페이지를 GA4 Data API에서 조회합니다."
      />

      {!data?.available ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data?.error ?? 'GA4 데이터를 불러오는 중입니다.'}
        </div>
      ) : null}

      <AdminSectionCard
        title="30일 DAU 트렌드"
        description="일자별 활성 사용자 추이를 확인합니다."
      >
        {hasTrend ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={data?.trend ?? []}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="activeUsers"
                name="활성유저"
                stroke="#e07b39"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-stone-400">표시할 DAU 데이터가 없습니다.</p>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="채널별 유입"
        description="최근 30일 세션을 유입 채널별로 비교합니다."
      >
        {hasAcquisition ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data?.acquisition ?? []}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
              <XAxis
                dataKey="channel"
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="sessions"
                name="세션"
                fill="#4a90d9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-stone-400">표시할 유입 데이터가 없습니다.</p>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="인기 페이지 TOP 10"
        description="최근 30일 페이지뷰가 많은 경로입니다."
      >
        {hasTopPages ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                  <th className="py-2 pr-4">페이지</th>
                  <th className="py-2 text-right">조회수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data?.topPages.map((page) => (
                  <tr key={page.path}>
                    <td className="max-w-[520px] truncate py-3 pr-4 font-medium text-stone-900">
                      {page.path}
                    </td>
                    <td className="py-3 text-right font-mono text-stone-600">
                      {formatNumber(page.views)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400">표시할 페이지 데이터가 없습니다.</p>
        )}
      </AdminSectionCard>
    </div>
  );
}
