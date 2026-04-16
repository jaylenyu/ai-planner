'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { AppLogo } from '@/components/ui/AppLogo';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!token) {
      setError('유효하지 않은 링크입니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
      {done ? (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">비밀번호가 변경되었습니다</h2>
          <p className="text-sm text-stone-500">로그인 페이지로 이동합니다...</p>
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-bold text-stone-900">새 비밀번호 설정</h1>
          <p className="mb-6 text-sm text-stone-500">새로 사용할 비밀번호를 입력하세요.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">새 비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상 입력하세요"
                minLength={6}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">비밀번호 확인</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                loading
                  ? 'bg-gradient-to-br from-orange-400 to-pink-400 text-white opacity-70 cursor-not-allowed'
                  : 'bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:shadow-lg hover:from-orange-600 hover:to-pink-600 active:opacity-95'
              }`}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4 animate-fade-in-up">
        <div className="text-center mb-8">
          <AppLogo size="lg" href="/login" className="justify-center" />
        </div>
        <Suspense fallback={<div className="rounded-3xl bg-white p-8 text-center text-sm text-stone-400">로딩 중...</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-stone-500">
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
