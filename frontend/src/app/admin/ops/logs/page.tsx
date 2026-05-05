'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PrimaryButton } from '@/components/custom/primary-button';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminSectionCard } from '../../_components/AdminSectionCard';

export default function AdminLogsPage() {
  const [container, setContainer] = useState<'backend' | 'frontend'>('backend');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'logs', container, search],
    queryFn: () => adminApi.logs(container, search || undefined),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="운영 모니터링 / 로그"
        title="실시간 로그"
        description="CloudWatch 연동 전에는 DB 기반 액세스 로그를 tail 형태로 보여줍니다."
      />

      <AdminSectionCard
        title="실시간 로그"
        description="컨테이너와 검색어 기준으로 최근 로그를 조회합니다."
        action={
          <PrimaryButton type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            새로고침
          </PrimaryButton>
        }
      >
        {query.data?.source === 'fallback' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {query.data.error ?? 'CloudWatch 로그가 설정되지 않아 DB 기반 액세스 로그를 보여줍니다.'}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <select
            value={container}
            onChange={(e) => setContainer(e.target.value as 'backend' | 'frontend')}
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          >
            <option value="backend">backend</option>
            <option value="frontend">frontend</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색어"
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          {query.data?.lines.map((line, idx) => (
            <div key={`${line.timestamp}-${idx}`} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-stone-900">{line.level}</p>
                <p className="text-xs text-stone-500">{new Date(line.timestamp).toLocaleString('ko-KR')}</p>
              </div>
              <p className="mt-1 text-stone-600">{line.message}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
