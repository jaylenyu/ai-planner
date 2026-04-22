'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { AppLogo } from '@/components/ui/AppLogo';
import { authApi } from '@/lib/api';

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rawRedirect = searchParams.get('redirect') ?? '';
  const redirectPath =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/admin/board';

  useEffect(() => {
    localStorage.removeItem('ai_planner_admin_token');
    localStorage.removeItem('ai_planner_admin_refresh');
  }, []);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    await authApi.loginAdmin(loginEmail, loginPassword);
    window.location.href = redirectPath;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await doLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
      setLoading(false);
    }
  };

  const handlePublicLogin = async () => {
    setPublicLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/auth/public-login', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'publicadmin 로그인 실패');
      }
      window.location.href = redirectPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'publicadmin 로그인 실패');
      setPublicLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <AppLogo size="lg" className="justify-center" />
          <p className="mt-2 text-sm text-stone-500">관리자 전용 로그인입니다.</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/50">
          <h1 className="mb-6 text-xl font-bold text-stone-900">Admin Login</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 outline-none focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-stone-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 outline-none focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

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
                '관리자 로그인'
              )}
            </button>
          </form>
          <div className="mt-4 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={handlePublicLogin}
              disabled={publicLoading || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 transition-all hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publicLoading ? <Spinner size="sm" /> : null}
              publicadmin 계정으로 로그인
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-stone-500">
            일반 계정은 <Link href="/login" className="font-semibold text-orange-600">일반 로그인</Link>을 사용하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginContent />
    </Suspense>
  );
}
