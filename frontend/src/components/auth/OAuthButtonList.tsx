'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../lib/api';

interface OAuthProviderMeta {
  id: 'google' | 'kakao' | 'naver';
  name: string;
  className: string;
  icon: ReactElement;
}

const providers: OAuthProviderMeta[] = [
  {
    id: 'google',
    name: 'Google',
    className:
      'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    id: 'kakao',
    name: '카카오',
    className: 'border border-[#FEE500] bg-[#FEE500] text-stone-900 hover:bg-[#ffd900]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4C6.99 4 3 7.229 3 11.218c0 2.121 1.19 3.994 3.09 5.264L5.4 21l4.118-2.256c.816.144 1.482.232 2.482.232 5.01 0 9-3.229 9-7.218C21 7.229 17.01 4 12 4z" />
      </svg>
    ),
  },
  {
    id: 'naver',
    name: '네이버',
    className: 'border border-[#03C75A] bg-[#03C75A] text-white hover:bg-[#02b551]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 4h4.5l5 7.4V4H19v16h-4.5l-5-7.4V20H5z" />
      </svg>
    ),
  },
];

interface OAuthButtonListProps {
  actionLabel: string;
  className?: string;
}

export function OAuthButtonList({ actionLabel, className }: OAuthButtonListProps) {
  const wrapperClasses = className ?? 'mt-4 flex flex-col gap-3';
  const searchParams = useSearchParams();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const provider = searchParams.get('provider') as OAuthProviderMeta['id'] | null;
    if (error !== 'oauth_local_conflict') return;

    const providerName = providers.find((p) => p.id === provider)?.name ?? '해당 소셜';
    const message =
      `${providerName} 계정은 이미 이메일/비밀번호 로그인과 연결되어 있습니다. 먼저 로그인을 완료한 뒤 설정 화면에서 소셜 계정을 연동해주세요.`;

    const timer = window.setTimeout(() => {
      setToastMessage(message);
    }, 0);

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('error');
    currentUrl.searchParams.delete('provider');
    router.replace(`${currentUrl.pathname}${currentUrl.search}`, { scroll: false });

    return () => {
      clearTimeout(timer);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  return (
    <div className={wrapperClasses}>
      {toastMessage && (
        <div className="relative mb-2 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
          <div className="flex-1">
            <p className="text-sm font-semibold">소셜 계정 안내</p>
            <p className="mt-1 leading-relaxed">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-amber-500 transition-colors hover:text-amber-700"
          >
            X
            <span className="sr-only">닫기</span>
          </button>
        </div>
      )}
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={`${API_BASE_URL}/auth/${provider.id}`}
          className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${provider.className}`}
        >
          {provider.icon}
          {`${provider.name}로 ${actionLabel}`}
        </a>
      ))}
    </div>
  );
}
