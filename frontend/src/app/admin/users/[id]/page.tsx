'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { adminApi } from '@/lib/api';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAdminSession } from '../../_components/AdminSessionContext';
import { AdminPageHeader } from '../../_components/AdminPageHeader';

type TabKey = 'profile' | 'subscription' | 'payments' | 'plans' | 'workspaces';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'profile', label: '프로필' },
  { key: 'subscription', label: '구독' },
  { key: 'payments', label: '결제' },
  { key: 'plans', label: 'Plan' },
  { key: 'workspaces', label: '워크스페이스' },
];

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { adminReadOnly } = useAdminSession();
  const isReadOnlyAdmin = adminReadOnly;
  const [tab, setTab] = useState<TabKey>('profile');

  const userQuery = useQuery({
    queryKey: ['admin', 'users', params.id],
    queryFn: () => adminApi.user(params.id),
    enabled: !!params.id,
  });

  const roleMutation = useMutation({
    mutationFn: (role: 'USER' | 'ADMIN') => adminApi.updateRole(params.id, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users', params.id] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (suspended: boolean) => adminApi.suspendUser(params.id, suspended),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users', params.id] });
    },
  });

  const user = userQuery.data;
  const provider = useMemo(() => {
    if (!user) return 'Local';
    if (user.googleId) return 'Google';
    if (user.kakaoId) return 'Kakao';
    if (user.naverId) return 'Naver';
    return 'Local';
  }, [user]);
  const mutationDisabledReason = isReadOnlyAdmin
    ? '읽기 전용 관리자 계정입니다.'
    : isMobile
      ? '데스크탑에서 실행해주세요'
      : undefined;
  const canMutate = !isReadOnlyAdmin && !isMobile;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="사용자 / 상세"
        title={user?.email ?? '사용자 상세'}
        description={
          isReadOnlyAdmin
            ? '조회 전용 계정으로 열람만 가능합니다.'
            : '프로필, 구독, 결제, 플랜, 워크스페이스 이력을 확인합니다.'
        }
      />

      <AppCard padding="lg" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === item.key ? 'bg-[var(--brand-50)] text-[var(--brand-600)]' : 'bg-stone-50 text-stone-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {userQuery.isLoading ? <p className="text-sm text-stone-500">불러오는 중...</p> : null}

        {user ? (
          <>
            {tab === 'profile' && (
              <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="text-xs text-stone-500">이메일</p>
                    <p className="font-semibold text-stone-900">{user.email}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="text-xs text-stone-500">Provider</p>
                    <p className="font-semibold text-stone-900">{provider}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="text-xs text-stone-500">가입일</p>
                    <p className="font-semibold text-stone-900">{new Date(user.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="text-xs text-stone-500">최근 접속</p>
                    <p className="font-semibold text-stone-900">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : '-'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm">
                    <p className="text-xs text-stone-500">Role</p>
                    <p className="font-semibold text-stone-900">{user.role}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {user.isSuspended ? '정지된 계정' : '활성 계정'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canMutate || roleMutation.isPending}
                      title={mutationDisabledReason}
                      onClick={() => void roleMutation.mutateAsync(user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                    >
                      {user.role === 'ADMIN' ? 'USER로 변경' : 'ADMIN으로 변경'}
                    </PrimaryButton>
                    <PrimaryButton
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canMutate || suspendMutation.isPending}
                      title={mutationDisabledReason}
                      onClick={() => void suspendMutation.mutateAsync(!user.isSuspended)}
                    >
                      {user.isSuspended ? '정지 해제' : '계정 정지'}
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}

            {tab === 'subscription' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                  <p className="text-xs text-stone-500">현재 구독</p>
                  <p className="font-semibold text-stone-900">{user.subscription?.status ?? '없음'}</p>
                </div>
                {user.subscription && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                      <p className="text-xs text-stone-500">planCode</p>
                      <p className="font-semibold text-stone-900">{user.subscription.planCode}</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                      <p className="text-xs text-stone-500">currentPeriodEnd</p>
                      <p className="font-semibold text-stone-900">{user.subscription.currentPeriodEnd ? new Date(user.subscription.currentPeriodEnd).toLocaleString('ko-KR') : '-'}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {user.subscription?.payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-stone-900">{payment.orderId}</p>
                      <p className="text-stone-600">{payment.status} · ₩{new Intl.NumberFormat('ko-KR').format(payment.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'payments' && (
              <div className="space-y-3">
                {user.payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="font-semibold text-stone-900">{payment.orderId}</p>
                    <p className="mt-1 text-stone-600">{payment.status} · {payment.method} · ₩{new Intl.NumberFormat('ko-KR').format(payment.amount)}</p>
                    <p className="mt-1 text-xs text-stone-500">{new Date(payment.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'plans' && (
              <div className="space-y-3">
                {user.plans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="font-semibold text-stone-900">{plan.summary ?? plan.rawInput}</p>
                    <p className="mt-1 text-stone-600">{plan.workspace ? `${plan.workspace.name} 공유 플랜` : '개인 플랜'}</p>
                    <p className="mt-1 text-xs text-stone-500">{new Date(plan.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'workspaces' && (
              <div className="space-y-4">
                {user.workspaceMembership ? (
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm">
                    <p className="font-semibold text-stone-900">{user.workspaceMembership.workspace.name}</p>
                    <p className="mt-1 text-stone-600">역할: {user.workspaceMembership.role}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      소유자: {user.workspaceMembership.workspace.owner.email}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">현재 소속 워크스페이스가 없습니다.</p>
                )}
                {user.ownedWorkspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm">
                    <p className="font-semibold text-stone-900">{workspace.name}</p>
                    <p className="mt-1 text-stone-600">멤버 {workspace.members.length}명 · 플랜 {workspace.plans.length}개</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </AppCard>
    </div>
  );
}
