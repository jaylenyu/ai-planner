'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';

const oauthBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const oauthProviders = [
  {
    id: 'google',
    label: 'Google로 로그인',
    className: 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: 'kakao',
    label: '카카오로 로그인',
    className: 'border border-[#FEE500] bg-[#FEE500] text-stone-900 hover:bg-[#ffd900]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4C6.99 4 3 7.229 3 11.218c0 2.121 1.19 3.994 3.09 5.264L5.4 21l4.118-2.256c.816.144 1.482.232 2.482.232 5.01 0 9-3.229 9-7.218C21 7.229 17.01 4 12 4z" />
      </svg>
    ),
  },
  {
    id: 'naver',
    label: '네이버로 로그인',
    className: 'border border-[#03C75A] bg-[#03C75A] text-white hover:bg-[#02b551]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 4h4.5l5 7.4V4H19v16h-4.5l-5-7.4V20H5z" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) window.location.href = '/plan';
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/plan" className="inline-flex items-center gap-2.5 group">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/20 group-hover:shadow-xl transition-all duration-300">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">Dayplan</span>
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
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 animate-fade-in">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-orange-600 transition-colors">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <Button type="submit" loading={loading} className="w-full py-3.5">
              로그인
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-100" />
            <span className="text-xs text-stone-400">또는</span>
            <div className="h-px flex-1 bg-stone-100" />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {oauthProviders.map((provider) => (
              <a
                key={provider.id}
                href={`${oauthBaseUrl}/auth/${provider.id}`}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${provider.className}`}
              >
                {provider.icon}
                {provider.label}
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          아직 계정이 없으신가요?{' '}
          <Link href="/register" className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
