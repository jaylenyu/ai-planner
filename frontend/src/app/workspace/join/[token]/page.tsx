'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { workspaceApi } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function WorkspaceJoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.token) return;
    if (!getToken()) {
      router.replace(`/login?redirect=/workspace/join/${params.token}`);
      return;
    }

    let mounted = true;
    async function join() {
      try {
        await workspaceApi.join(params.token);
        if (!mounted) return;
        router.replace('/workspace');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '커플 플랜 참여에 실패했습니다.');
        setLoading(false);
      }
    }

    void join();
    return () => {
      mounted = false;
    };
  }, [params.token, router]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <AppCard padding="lg" className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-orange-600">초대 수락</p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">
              커플 플랜에 참여하는 중입니다
            </h1>
          </div>
          {loading && <p className="text-sm text-stone-500">초대를 확인하는 중...</p>}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <PrimaryButton asChild variant="outline" size="sm">
              <Link href="/workspace">커플 플랜으로 이동</Link>
            </PrimaryButton>
            <PrimaryButton asChild variant="outline" size="sm">
              <Link href="/plan">일정으로 이동</Link>
            </PrimaryButton>
          </div>
        </AppCard>
      </div>
    </main>
  );
}
