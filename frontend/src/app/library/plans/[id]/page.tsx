'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { PlaceMapDialog } from '@/components/plan/PlaceMapDialog';
import { EditItemDialog } from '@/components/plan/EditItemDialog';
import { PlanMemoThread } from '@/components/plan/PlanMemoThread';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { useCategories } from '@/hooks/useCategories';
import { planApi } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
import { queryKeys } from '@/lib/query';
import type { PlanItem, PlanSummary } from '@/lib/types';

const EMPTY_NEW_ITEM = {
  name: '',
  type: 'activity',
  time: '',
  address: '',
  lat: 37.5665,
  lng: 126.978,
};

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  const [selectedPlace, setSelectedPlace] = useState<PlanItem | null>(null);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM);
  const currentUserEmail = getAuthUser()?.email ?? null;

  const planQuery = useQuery<PlanSummary>({
    queryKey: queryKeys.plan(params.id),
    queryFn: () => planApi.get(params.id),
    enabled: !!params.id,
    staleTime: 10 * 1000,
  });
  const plan = planQuery.data ?? null;
  const loading = planQuery.isLoading;
  const error = planQuery.error instanceof Error ? planQuery.error.message : null;

  const syncPlan = (next: PlanSummary) => {
    queryClient.setQueryData(queryKeys.plan(next.id), next);
    void queryClient.invalidateQueries({ queryKey: ['plans'] });
  };

  const handleBackToLibrary = () => {
    const referrer = document.referrer;
    const isInternalReferrer =
      !!referrer && referrer.startsWith(window.location.origin);

    if (isInternalReferrer) {
      router.back();
      return;
    }

    router.push('/library', { scroll: true });
  };

  return (
    <div className="bg-[var(--background)]">
      <header className="sticky top-0 z-40 glass border-b border-stone-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleBackToLibrary}
            className="text-sm font-semibold text-stone-700"
          >
            ← 보관함으로 돌아가기
          </button>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <PrimaryButton asChild variant="outline" size="sm">
              <Link href="/workspace">워크스페이스</Link>
            </PrimaryButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {loading && <p className="text-sm text-stone-500">플랜을 불러오는 중...</p>}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {plan && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <AppCard padding="lg" className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-stone-500">
                      {plan.workspace ? '공유 일정' : '개인 일정'}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-stone-900">
                      {plan.summary ?? plan.rawInput}
                    </h1>
                    {plan.workspace && (
                      <p className="mt-2 text-sm text-violet-700">
                        {plan.workspace.name} 워크스페이스에서 공유 중
                      </p>
                    )}
                  </div>
                  <div className="w-full max-w-[220px]">
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      카테고리
                    </label>
                    <select
                      value={plan.category?.id ?? ''}
                      onChange={async (event) => {
                        const updated = await planApi.update(plan.id, {
                          updatedAt: plan.updatedAt,
                          categoryId: event.target.value || null,
                        });
                        syncPlan(updated);
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-orange-300"
                    >
                      <option value="">미분류</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {plan.items.map((item) => (
                    <div
                      key={item.id ?? `${item.order}-${item.name}`}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {item.order}. {item.name}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">{item.time}</p>
                          <p className="mt-1 text-sm text-stone-500">{item.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <PrimaryButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPlace(item)}
                          >
                            지도
                          </PrimaryButton>
                          <PrimaryButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            수정
                          </PrimaryButton>
                          {item.id && (
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                              aria-label="장소 삭제"
                              onClick={async () => {
                                const next = await planApi.deleteItem(plan.id, item.id!, {
                                  updatedAt: plan.updatedAt,
                                });
                                syncPlan(next);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>

              <AppCard padding="lg" className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">장소 추가</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    수동으로 장소를 하나 더 넣을 수 있습니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="장소 이름"
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                  <select
                    value={newItem.type}
                    onChange={(e) =>
                      setNewItem((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  >
                    <option value="food">식사</option>
                    <option value="cafe">카페</option>
                    <option value="activity">액티비티</option>
                    <option value="attraction">관광</option>
                    <option value="rest">휴식</option>
                  </select>
                  <input
                    value={newItem.time}
                    onChange={(e) =>
                      setNewItem((prev) => ({ ...prev, time: e.target.value }))
                    }
                    placeholder="19:00 - 20:30"
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={newItem.address}
                    onChange={(e) =>
                      setNewItem((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="주소"
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                </div>
                <PrimaryButton
                  type="button"
                  variant="brand"
                  size="sm"
                  disabled={!newItem.name.trim() || !newItem.time.trim()}
                  onClick={async () => {
                    const next = await planApi.addItem(plan.id, {
                      updatedAt: plan.updatedAt,
                      ...newItem,
                    });
                    syncPlan(next);
                    setNewItem(EMPTY_NEW_ITEM);
                  }}
                >
                  장소 추가
                </PrimaryButton>
              </AppCard>
            </div>

            <AppCard padding="lg" className="h-fit space-y-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">메모</h2>
                <p className="mt-1 text-sm text-stone-500">
                  상대와 공유할 메모를 남길 수 있습니다.
                </p>
              </div>
              <PlanMemoThread
                memos={plan.memos ?? []}
                currentUserEmail={currentUserEmail}
                onCreate={async (content) => {
                  await planApi.createMemo(plan.id, { content });
                  await planQuery.refetch();
                }}
                onDelete={async (memoId) => {
                  await planApi.deleteMemo(plan.id, memoId);
                  await planQuery.refetch();
                }}
              />
            </AppCard>
          </div>
        )}
      </main>

      <PlaceMapDialog
        open={!!selectedPlace}
        item={selectedPlace}
        onOpenChange={(open) => {
          if (!open) setSelectedPlace(null);
        }}
      />
      <EditItemDialog
        open={!!editingItem}
        item={editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onSave={async (next) => {
          if (!plan || !editingItem?.id) return;
          const updated = await planApi.updateItem(plan.id, editingItem.id, {
            updatedAt: plan.updatedAt,
            ...next,
          });
          syncPlan(updated);
        }}
      />
    </div>
  );
}
