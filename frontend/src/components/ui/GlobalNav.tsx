'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppLogo } from '@/components/ui/AppLogo';
import { NotificationBell } from '@/components/notification/NotificationBell';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isLibraryRoute =
    href === '/library' &&
    (pathname === '/library' || pathname.startsWith('/library/plans/'));
  const isActive = isLibraryRoute || pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={
        isActive
          ? 'text-sm font-bold text-stone-900'
          : 'text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors'
      }
    >
      {children}
    </Link>
  );
}

export function GlobalNav() {
  const { isLoggedIn, logout } = useAuth();
  const pathname = usePathname();
  const showMarketingLinks = !isLoggedIn && pathname === '/';

  return (
    <header
      className="sticky top-0 z-50 glass"
      style={{ borderBottom: '1px solid var(--divider)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <AppLogo size="md" showSubtitle />

        {/* 모바일: 로그인/로그아웃만 */}
        <div className="flex items-center gap-2 sm:hidden">
          {isLoggedIn ? (
            <>
              <NavLink href="/dashboard">대시보드</NavLink>
              <NavLink href="/plan">일정 만들기</NavLink>
              <button
                type="button"
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              {showMarketingLinks && (
                <Link
                  href="/#features"
                  className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
                >
                  기능
                </Link>
              )}
              <Link
                href="/login"
                className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                로그인
              </Link>
            </>
          )}
        </div>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden items-center gap-5 sm:flex">
          {isLoggedIn ? (
            <>
              <NotificationBell />
              <NavLink href="/dashboard">대시보드</NavLink>
              <NavLink href="/plan">일정 만들기</NavLink>
              <NavLink href="/library">보관함</NavLink>
              <NavLink href="/workspace">워크스페이스</NavLink>
              <NavLink href="/subscribe">구독</NavLink>
            </>
          ) : showMarketingLinks ? (
            <>
              <Link
                href="/#features"
                className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                기능 소개
              </Link>
              <Link
                href="/#workflow"
                className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                작동 방식
              </Link>
            </>
          ) : null}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              로그아웃
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <NavLink href="/login">로그인</NavLink>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                시작하기
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
