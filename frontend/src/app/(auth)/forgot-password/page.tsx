'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center gap-2.5 group">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/20 group-hover:shadow-xl transition-all duration-300">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">DatePlanner</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-stone-900 mb-2">이메일을 전송했습니다</h2>
              <p className="text-sm text-stone-500">
                <span className="font-medium text-stone-700">{email}</span>로 비밀번호 재설정 링크를 보냈어요.<br />
                메일함을 확인해주세요. (1시간 내 유효)
              </p>
              <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-xl font-bold text-stone-900">비밀번호 재설정</h1>
              <p className="mb-6 text-sm text-stone-500">가입한 이메일 주소를 입력하면 재설정 링크를 보내드려요.</p>
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
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-stone-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? '전송 중...' : '재설정 링크 보내기'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
