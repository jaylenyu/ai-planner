'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await register(email, password);
    if (ok) router.push('/plan');
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
          <p className="mt-2 text-sm text-stone-500">가입하고 나만의 일정을 만들어보세요</p>
        </div>

        {/* Form card */}
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
          <h1 className="mb-6 text-xl font-bold text-stone-900">회원가입</h1>
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
                placeholder="6자 이상 입력하세요"
                minLength={6}
                required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 animate-fade-in">
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full py-3.5">
              회원가입
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
