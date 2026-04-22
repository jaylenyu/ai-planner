'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { AdminSectionCard } from '../_components/AdminSectionCard';

function BarChart({ value, max }: { value: number; max: number }) {
  const width = max === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
  return (
    <div className="h-3 rounded-full bg-stone-100">
      <div className="h-3 rounded-full bg-[var(--brand-500)]" style={{ width: `${width}%` }} />
    </div>
  );
}

export default function AdminPlansPage() {
  const query = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => adminApi.plans(),
  });

  const max = Math.max(
    query.data?.timeline.daily ?? 0,
    query.data?.timeline.weekly ?? 0,
    query.data?.timeline.monthly ?? 0,
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
            ['일', query.data?.timeline.daily ?? 0],
            ['주', query.data?.timeline.weekly ?? 0],
            ['월', query.data?.timeline.monthly ?? 0],
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
          {query.data?.suspiciousUsers.length ? (
            <div className="space-y-3">
              {query.data.suspiciousUsers.map((item) => (
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
          title="워크스페이스 목록"
          description="최근 워크스페이스의 소유자와 멤버 수를 보여줍니다."
        >
          <div className="space-y-3">
            {(query.data?.workspaces ?? []).slice(0, 10).map((workspace) => (
              <div key={workspace.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-stone-900">{workspace.name}</p>
                <p className="mt-1 text-stone-600">
                  소유자 {workspace.owner.email} · 멤버 {workspace._count.members}명 · 플랜 {workspace._count.plans}개
                </p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Plan 목록"
        description="최근 생성된 플랜과 공유 여부를 확인합니다."
      >
        <div className="space-y-3">
          {(query.data?.plans ?? []).slice(0, 10).map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm">
              <p className="font-semibold text-stone-900">{plan.summary ?? plan.rawInput}</p>
              <p className="mt-1 text-stone-600">
                {plan.workspace ? `${plan.workspace.name} 공유` : '개인'} · {plan.user.email}
              </p>
            </div>
            ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
