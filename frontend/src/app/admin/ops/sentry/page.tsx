'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminSectionCard } from '../../_components/AdminSectionCard';
import { AdminLoading } from '../../_components/AdminLoading';

export default function AdminSentryPage() {
  const query = useQuery({
    queryKey: ['admin', 'sentry'],
    queryFn: () => adminApi.sentry(),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="운영 모니터링 / Sentry"
        title="최근 unresolved 이슈"
        description="외부 연동이 없으면 빈 상태로 유지되고, 설정되면 최근 이슈만 읽어옵니다."
      />

      <AdminSectionCard
        title="최근 unresolved 이슈"
        description="설정이 있으면 Sentry 최근 이슈를 읽고, 없으면 빈 상태를 유지합니다."
      >
        {query.isLoading ? (
          <AdminLoading label="Sentry 이슈 불러오는 중..." />
        ) : (
          <>
        {query.data?.available ? (
          <p className="text-sm text-green-700">Sentry 연결됨</p>
        ) : (
          <p className="text-sm text-stone-500">Sentry가 아직 설정되지 않았습니다.</p>
        )}
        {!query.data?.available && query.data?.error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {query.data.error}
          </div>
        ) : null}
        <div className="space-y-3">
          {query.data?.issues.map((issue) => (
            <div key={issue.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-stone-900">{issue.title}</p>
                <span className="text-xs text-stone-500">{issue.count} hits</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                first {new Date(issue.firstSeen).toLocaleString('ko-KR')} · last {new Date(issue.lastSeen).toLocaleString('ko-KR')}
              </p>
              <Link href={issue.permalink} className="mt-2 inline-block text-orange-600">
                원본 링크
              </Link>
            </div>
          ))}
        </div>
          </>
        )}
      </AdminSectionCard>
    </div>
  );
}
