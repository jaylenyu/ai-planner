'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminSectionCard } from '../../_components/AdminSectionCard';
import { AdminLoading } from '../../_components/AdminLoading';

export default function AdminApiUsagePage() {
  const query = useQuery({
    queryKey: ['admin', 'api-usage'],
    queryFn: () => adminApi.apiUsage(),
  });

  const or = query.data?.openrouter;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="운영 모니터링 / API 사용량"
        title="API 사용량 & 비용"
        description="일별 사용량과 비용, 그리고 상위 사용자 목록을 보여줍니다."
      />

      <AdminSectionCard
        title="OpenRouter 실제 지출"
        description="OPENROUTER_API_KEY 기준 누적 크레딧 사용액입니다."
      >
        {query.isLoading ? (
          <AdminLoading />
        ) : !or ? (
          <p className="text-sm text-stone-400">로딩 중...</p>
        ) : !or.configured ? (
          <p className="text-sm text-stone-400">OPENROUTER_API_KEY가 설정되지 않았습니다.</p>
        ) : or.usage === null ? (
          <p className="text-sm text-red-500">오류: {or.error}</p>
        ) : (
          <p className="text-2xl font-bold text-stone-900">
            ${or.usage.toFixed(4)}
            <span className="ml-2 text-sm font-normal text-stone-500">USD (누적)</span>
          </p>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Top 10 사용자"
        description="요청 수와 비용 기준 상위 사용자를 빠르게 찾습니다."
      >
        {query.isLoading ? <AdminLoading /> : null}
        <div className="space-y-2">
          {query.data?.topUsers.map((item) => (
            <div key={item.userId} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <Link href={`/admin/users/${item.userId}`} className="font-semibold text-orange-600">
                {item.userId}
              </Link>
              <div className="text-right text-stone-600">
                <p>요청 {item._count._all}회</p>
                <p>${(item._sum.cost ?? 0).toFixed(3)}</p>
              </div>
            </div>
            ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="일별 집계"
        description="최근 일자별 요청 수와 비용을 요약합니다."
      >
        {query.isLoading ? <AdminLoading /> : null}
        <div className="grid gap-2 md:grid-cols-3">
          {Object.entries(query.data?.totalsByDay ?? {}).slice(-9).map(([date, value]) => (
            <div key={date} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <p className="text-xs text-stone-500">{date}</p>
              <p className="font-semibold text-stone-900">{value.count} requests</p>
              <p className="text-stone-600">${value.cost.toFixed(3)}</p>
            </div>
            ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
