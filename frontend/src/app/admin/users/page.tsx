'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDeferredValue } from 'react';
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AppCard } from '@/components/custom/app-card';
import { DataTable } from '@/components/custom/data-table';
import { PrimaryButton } from '@/components/custom/primary-button';
import { adminApi } from '@/lib/api';
import type { AdminUserListResponse } from '@/lib/types';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAdminSession } from '../_components/AdminSessionContext';
import { AdminPageHeader } from '../_components/AdminPageHeader';

const PAGE_SIZE = 10;
type ProviderFilter = 'google' | 'kakao' | 'naver' | 'local' | '';
type EmailVerifiedFilter = 'all' | 'true' | 'false';
type AdminUserRow = AdminUserListResponse['items'][number];
const desktopColumnLabels: Record<string, string> = {
  email: '이메일',
  createdAt: '가입일',
  provider: 'provider',
  emailVerified: '인증',
  subscription: '구독',
  lastLoginAt: '최근 접속',
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { adminReadOnly } = useAdminSession();
  const isReadOnlyAdmin = adminReadOnly;
  const [searchInput, setSearchInput] = useState('');
  const [provider, setProvider] = useState<ProviderFilter>('');
  const [emailVerified, setEmailVerified] = useState<EmailVerifiedFilter>('all');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    email: true,
    createdAt: true,
    provider: true,
    emailVerified: true,
    subscription: true,
    lastLoginAt: true,
    actions: true,
  });
  const search = useDeferredValue(searchInput.trim());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const usersQuery = useInfiniteQuery({
    queryKey: ['admin', 'users', { search, provider, emailVerified }],
    queryFn: ({ pageParam }) =>
      adminApi.users({
        search: search || undefined,
        provider: provider || undefined,
        emailVerified: emailVerified === 'all' ? undefined : emailVerified === 'true',
        page: pageParam as number,
        limit: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage as AdminUserListResponse & { page: number; totalPages: number };
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      adminApi.updateRole(id, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      adminApi.suspendUser(id, suspended),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const items = useMemo(
    () => usersQuery.data?.pages.flatMap((p) => (p as AdminUserListResponse).items) ?? [],
    [usersQuery.data],
  );
  const total = (usersQuery.data?.pages[0] as AdminUserListResponse | undefined)?.total ?? 0;
  const loadedCount = items.length;

  const loadMore = useCallback(() => {
    if (usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) {
      void usersQuery.fetchNextPage();
    }
  }, [usersQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const providerLabel = useMemo(
    () => ({ google: 'Google', kakao: 'Kakao', naver: 'Naver', local: 'Local' }),
    [],
  );
  const mutationDisabledReason = isReadOnlyAdmin
    ? '읽기 전용 관리자 계정입니다.'
    : isMobile
      ? '데스크탑에서 실행해주세요'
      : undefined;
  const canMutate = !isReadOnlyAdmin && !isMobile;
  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        accessorKey: 'email',
        header: '이메일',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="font-semibold text-stone-900">
            <Link
              href={`/admin/users/${row.original.id}`}
              className="inline-flex items-center gap-1 text-orange-600"
            >
              {row.original.email}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="text-xs font-normal text-stone-500">{row.original.id}</p>
          </div>
        ),
      },
      {
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        id: 'createdAt',
        header: '가입일',
        cell: ({ row }) => (
          <span className="text-stone-600">
            {new Date(row.original.createdAt).toLocaleDateString('ko-KR')}
          </span>
        ),
      },
      {
        accessorFn: (row) =>
          row.googleId
            ? 'Google'
            : row.kakaoId
              ? 'Kakao'
              : row.naverId
                ? 'Naver'
                : 'Local',
        id: 'provider',
        header: 'provider',
        cell: ({ row }) => (
          <span className="text-stone-600">
            {row.original.googleId
              ? 'Google'
              : row.original.kakaoId
                ? 'Kakao'
                : row.original.naverId
                  ? 'Naver'
                  : 'Local'}
          </span>
        ),
      },
      {
        accessorFn: (row) => (row.emailVerified ? 1 : 0),
        id: 'emailVerified',
        header: '인증',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              row.original.emailVerified
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {row.original.emailVerified ? 'verified' : 'pending'}
          </span>
        ),
      },
      {
        accessorFn: (row) => row.subscription?.status ?? '',
        id: 'subscription',
        header: '구독',
        cell: ({ row }) => (
          <span className="text-stone-600">
            {row.original.subscription?.status ?? '-'}
          </span>
        ),
      },
      {
        accessorFn: (row) =>
          row.lastLoginAt ? new Date(row.lastLoginAt).getTime() : 0,
        id: 'lastLoginAt',
        header: '최근 접속',
        cell: ({ row }) => (
          <span className="text-stone-600">
            {row.original.lastLoginAt
              ? new Date(row.original.lastLoginAt).toLocaleDateString('ko-KR')
              : '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '액션',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex gap-2">
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href={`/admin/users/${user.id}`}>상세</Link>
              </PrimaryButton>
              <PrimaryButton
                type="button"
                variant="outline"
                size="sm"
                disabled={!canMutate || roleMutation.isPending}
                title={mutationDisabledReason}
                onClick={() =>
                  void roleMutation.mutateAsync({
                    id: user.id,
                    role: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
                  })
                }
              >
                {user.role === 'ADMIN' ? 'USER로 변경' : 'ADMIN으로 변경'}
              </PrimaryButton>
              <PrimaryButton
                type="button"
                variant="outline"
                size="sm"
                disabled={!canMutate || suspendMutation.isPending}
                title={mutationDisabledReason}
                onClick={() =>
                  void suspendMutation.mutateAsync({
                    id: user.id,
                    suspended: !user.isSuspended,
                  })
                }
              >
                {user.isSuspended ? '정지 해제' : '정지'}
              </PrimaryButton>
            </div>
          );
        },
      },
    ],
    [
      canMutate,
      mutationDisabledReason,
      roleMutation,
      suspendMutation,
    ],
  );
  const visibleDesktopColumns = columns.filter(
    (column) =>
      column.id &&
      column.id !== 'actions' &&
      column.id in desktopColumnLabels,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumb="사용자"
        title="사용자 관리"
        description={
          isReadOnlyAdmin
            ? '검색과 조회는 가능하지만 역할 변경, 정지 같은 쓰기 작업은 비활성화됩니다.'
            : '검색, 역할 변경, 계정 정지, 구독 상태를 한 화면에서 다룹니다.'
        }
      />

      <AppCard padding="lg" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
            }}
            placeholder="이메일 또는 ID 검색"
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
          />
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as ProviderFilter);
            }}
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          >
            <option value="">provider 전체</option>
            <option value="local">Local</option>
            <option value="google">Google</option>
            <option value="kakao">Kakao</option>
            <option value="naver">Naver</option>
          </select>
          <select
            value={emailVerified}
            onChange={(e) => {
              setEmailVerified(e.target.value as EmailVerifiedFilter);
            }}
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          >
            <option value="all">인증 전체</option>
            <option value="true">인증됨</option>
            <option value="false">미인증</option>
          </select>
          <div className="flex items-center gap-2">
            <PrimaryButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setProvider('');
                setEmailVerified('all');
              }}
            >
              필터 초기화
            </PrimaryButton>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            컬럼 표시
          </p>
          {visibleDesktopColumns.map((column) => {
            const id = column.id as keyof typeof desktopColumnLabels;
            const visible = columnVisibility[id] !== false;

            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setColumnVisibility((prev) => ({
                    ...prev,
                    [id]: prev[id] === false,
                  }))
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  visible
                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                    : 'border-stone-200 bg-white text-stone-500'
                }`}
              >
                {desktopColumnLabels[id]}
              </button>
            );
          })}
        </div>
      </AppCard>

      {usersQuery.isLoading ? (
        <p className="text-sm text-stone-500">사용자 목록을 불러오는 중...</p>
      ) : null}

      <AppCard padding="lg" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-stone-900">사용자 목록</h2>
          <div className="text-right text-sm text-stone-500">
            <p>
              {loadedCount} / {total}명
            </p>
            <p className="text-xs">
              정렬: {sorting[0] ? `${desktopColumnLabels[sorting[0].id] ?? sorting[0].id} ${sorting[0].desc ? '내림차순' : '오름차순'}` : '없음'}
            </p>
          </div>
        </div>

        <DataTable
          data={items}
          columns={columns}
          emptyMessage="조건에 맞는 사용자가 없습니다."
          className="hidden lg:block"
          sorting={sorting}
          onSortingChange={setSorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />

        <div className="space-y-3 lg:hidden">
          {items.map((user) => (
            <AppCard key={user.id} padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{user.email}</p>
                  <p className="text-xs text-stone-500">{user.id}</p>
                </div>
                <span className="text-xs font-semibold text-stone-500">{providerLabel[user.googleId ? 'google' : user.kakaoId ? 'kakao' : user.naverId ? 'naver' : 'local']}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-stone-600">
                <div>구독: {user.subscription?.status ?? '-'}</div>
                <div>가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</div>
                <div>인증: {user.emailVerified ? 'verified' : 'pending'}</div>
                <div>접속: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR') : '-'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton asChild variant="outline" size="sm">
                  <Link href={`/admin/users/${user.id}`}>상세</Link>
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title={mutationDisabledReason}
                >
                  역할 변경
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title={mutationDisabledReason}
                >
                  정지
                </PrimaryButton>
              </div>
            </AppCard>
          ))}
        </div>

        <div ref={sentinelRef} className="flex justify-center py-4">
          {usersQuery.isFetchingNextPage ? (
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          ) : usersQuery.hasNextPage ? (
            <span className="text-xs text-stone-400">스크롤하면 더 불러옵니다</span>
          ) : loadedCount > 0 ? (
            <span className="text-xs text-stone-400">모든 사용자를 불러왔습니다 ({total}명)</span>
          ) : null}
        </div>
      </AppCard>
    </div>
  );
}
