'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { event } from '@/lib/ga4';
import { useAuthStore } from '../../../stores/authStore';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      useAuthStore.getState().setTokens(accessToken, refreshToken);
      event('login', { method: 'oauth' });
      router.replace('/plan');
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500" />
        <p className="text-sm text-stone-500">로그인 처리 중...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center hero-pattern">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500" />
          <p className="text-sm text-stone-500">로그인 처리 중...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
