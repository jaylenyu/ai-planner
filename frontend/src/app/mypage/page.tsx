'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, Settings, Users } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/dialog';
import { useMe } from '@/hooks/useMe';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useNotifications } from '@/hooks/useNotifications';
import { usePlanList } from '@/hooks/usePlanList';
import { billingApi } from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <AppCard padding="md" className="space-y-3 animate-pulse">
      <div className="h-4 w-1/3 rounded-full bg-stone-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 rounded-full bg-stone-100" />
      ))}
    </AppCard>
  );
}

function MypageContent() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const { status: subStatus, loading: subLoading, refetch } = useSubscriptionStatus();
  const { workspace, loading: wsLoading } = useWorkspace();
  const { items: notifications, loading: notiLoading } = useNotifications();
  const { plans, loading: plansLoading } = usePlanList();

  const recentPlans = plans?.slice(0, 3) ?? [];

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);
  const [cancelledUntil, setCancelledUntil] = useState<string | null>(null);

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const endDate = subStatus?.subscription.currentPeriodEnd ?? null;
      await billingApi.cancel();
      await refetch();
      setCancelledUntil(endDate);
      setCancelOpen(false);
      setCancelSuccessOpen(true);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="bg-[var(--background)]">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">마이페이지</h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {/* 계정 요약 */}
          {meLoading ? (
            <SkeletonCard />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">계정</p>
                  <p className="mt-1 text-base font-bold text-stone-900 break-all">{me?.email ?? '-'}</p>
                </div>
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/settings')}
                >
                  <Settings className="h-4 w-4" />
                  설정
                </PrimaryButton>
              </div>
              <div className="space-y-1 text-sm text-stone-600">
                <p>가입일 {me?.createdAt ? formatDate(me.createdAt) : '-'}</p>
                <p>마지막 로그인 {me?.lastLoginAt ? formatDate(me.lastLoginAt) : '정보 없음'}</p>
              </div>
            </AppCard>
          )}

          {/* 구독 카드 */}
          {subLoading ? (
            <SkeletonCard />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">구독</p>
                <p className="mt-1 text-base font-bold text-stone-900">
                  {subStatus?.subscription.planCode ?? '무료 플랜'}
                </p>
              </div>
              <div className="space-y-1 text-sm text-stone-600">
                <p>
                  상태:{' '}
                  <span className="font-medium text-stone-800">
                    {subStatus?.hasAccess ? '활성' : '비활성'}
                  </span>
                </p>
                {subStatus?.subscription.currentPeriodEnd && (
                  <p>다음 결제일 {formatDate(subStatus.subscription.currentPeriodEnd)}</p>
                )}
              </div>
              {subStatus?.hasAccess ? (
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                >
                  구독 취소
                </PrimaryButton>
              ) : (
                <Link href="/subscribe">
                  <PrimaryButton type="button" variant="brand" size="sm">
                    구독 관리
                  </PrimaryButton>
                </Link>
              )}
            </AppCard>
          )}

          {/* 커플 플랜 카드 */}
          {wsLoading ? (
            <SkeletonCard />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">커플 플랜</p>
              </div>
              {workspace ? (
                <div className="space-y-1 text-sm text-stone-700">
                  <p className="font-semibold text-stone-900">{workspace.name}</p>
                  <p>멤버 {workspace.members.length}명</p>
                  {workspace.members
                    .filter((m) => m.role !== 'owner')
                    .slice(0, 1)
                    .map((m) => (
                      <p key={m.id} className="text-stone-500">파트너: {m.user.email}</p>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">파트너 없음</p>
              )}
              <Link href="/workspace">
                <PrimaryButton type="button" variant="outline" size="sm">
                  커플 플랜
                </PrimaryButton>
              </Link>
            </AppCard>
          )}

          {/* 알림 카드 */}
          {notiLoading ? (
            <SkeletonCard />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">알림</p>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-stone-500">읽지 않은 알림이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-stone-900">
                    읽지 않은 알림 {notifications.length}개
                  </p>
                  {notifications.slice(0, 3).map((n) => (
                    <div key={n.id} className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
                      {n.type}
                    </div>
                  ))}
                </div>
              )}
            </AppCard>
          )}

          {/* 최근 일정 */}
          <AppCard padding="md" className="space-y-4 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">최근 일정</p>
              </div>
              <Link
                href="/library"
                className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                보관함 전체 보기
              </Link>
            </div>
            {plansLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-stone-100" />
                ))}
              </div>
            ) : recentPlans.length === 0 ? (
              <p className="text-sm text-stone-500">저장된 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentPlans.map((plan) => (
                  <Link key={plan.id} href={`/library/plans/${plan.id}`}>
                    <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer">
                      <p className="font-medium text-stone-900 truncate">{plan.summary ?? plan.rawInput}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{formatDate(plan.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </AppCard>
        </div>
      </main>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="구독을 취소할까요?"
        description="취소 후에도 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다."
        confirmLabel="구독 취소"
        cancelLabel="돌아가기"
        destructive
        loading={cancelLoading}
        onConfirm={() => void handleCancelSubscription()}
      />

      <Dialog
        open={cancelSuccessOpen}
        onOpenChange={setCancelSuccessOpen}
        title="구독이 취소되었습니다"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            {cancelledUntil
              ? `${formatDate(cancelledUntil)}까지 서비스를 계속 이용하실 수 있습니다.`
              : '구독이 정상적으로 취소되었습니다.'}
          </p>
          <div className="flex justify-end">
            <PrimaryButton
              type="button"
              variant="brand"
              size="sm"
              onClick={() => setCancelSuccessOpen(false)}
            >
              확인
            </PrimaryButton>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function MypagePage() {
  return (
    <Suspense fallback={null}>
      <MypageContent />
    </Suspense>
  );
}
