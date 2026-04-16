'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { OAuthButtonList } from '../../../components/auth/OAuthButtonList';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, errorStatus } = useAuth();
  const isLocked = Boolean(error && errorStatus === 403 && error.includes('제한'));
  const redirectPath = searchParams.get('redirect') || '/plan';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) window.location.href = redirectPath;
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/20 group-hover:shadow-xl transition-all duration-300">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">DatePlanner</span>
          </Link>
          <p className="mt-2 text-sm text-stone-500">다시 오셨네요! 오늘은 어디로 가볼까요?</p>
        </div>

        {/* Form card */}
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
          <h1 className="mb-6 text-xl font-bold text-stone-900">로그인</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                <p>{error}</p>
                {isLocked && (
                  <p className="mt-1 text-xs font-semibold text-orange-600">
                    10분 후 다시 시도해주세요.
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-orange-600 transition-colors">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                loading
                  ? 'bg-gradient-to-br from-orange-400 to-pink-400 text-white opacity-70 cursor-not-allowed'
                  : 'bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:shadow-lg hover:from-orange-600 hover:to-pink-600 active:opacity-95'
              }`}
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>로그인 중...</span>
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-100" />
            <span className="text-xs text-stone-400">또는</span>
            <div className="h-px flex-1 bg-stone-100" />
          </div>

          <Suspense fallback={null}>
            <OAuthButtonList actionLabel="로그인" />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          아직 계정이 없으신가요?{' '}
          <Link href={`/register${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`} className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
