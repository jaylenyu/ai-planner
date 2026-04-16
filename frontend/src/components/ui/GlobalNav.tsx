"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppLogo } from "@/components/ui/AppLogo";
import { NotificationBell } from "@/components/notification/NotificationBell";
import {
  LayoutDashboard,
  CalendarPlus,
  Archive,
  Users,
  LogOut,
  Crown,
} from "lucide-react";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isLibraryRoute =
    href === "/library" &&
    (pathname === "/library" || pathname.startsWith("/library/plans/"));
  const isActive =
    isLibraryRoute || pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={
        isActive
          ? "text-sm font-bold text-stone-900"
          : "text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
      }
    >
      {children}
    </Link>
  );
}

interface MobileTabProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function MobileTab({ href, icon, label }: MobileTabProps) {
  const pathname = usePathname();
  const isLibraryRoute =
    href === "/library" &&
    (pathname === "/library" || pathname.startsWith("/library/plans/"));
  const isActive =
    isLibraryRoute || pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 min-w-[48px] min-h-[44px] justify-center transition-colors ${
        isActive ? "text-orange-600" : "text-stone-400"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </Link>
  );
}

export function GlobalNav() {
  const { isLoggedIn, logout } = useAuth();
  const pathname = usePathname();
  const showMarketingLinks = !isLoggedIn && pathname === "/";

  return (
    <>
      {/* Top header */}
      <header
        className="sticky top-0 z-50 glass"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4 sm:px-6">
          <AppLogo size="md" showSubtitle />

          {/* 모바일: 알림 + 로그아웃만 */}
          <div className="flex items-center gap-3 sm:hidden">
            {isLoggedIn ? (
              <>
                <NotificationBell />
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                  className="flex items-center justify-center h-9 w-9 rounded-full text-stone-400 active:bg-stone-100 transition-colors"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                {showMarketingLinks && (
                  <Link
                    href="/#features"
                    className="text-sm font-medium text-stone-500 active:text-stone-800 transition-colors"
                  >
                    기능
                  </Link>
                )}
                <Link
                  href="/login"
                  className="text-sm font-medium text-stone-500 active:text-stone-800 transition-colors"
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
                  window.location.href = "/login";
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

      {/* 모바일 Bottom Tab Bar */}
      {isLoggedIn && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white"
          style={{ borderTop: "1px solid var(--divider)" }}
        >
          <div className="flex items-center justify-around px-2 py-1 safe-area-pb">
            <MobileTab
              href="/dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="홈"
            />
            <MobileTab
              href="/plan"
              icon={<CalendarPlus className="h-5 w-5" />}
              label="일정"
            />
            <MobileTab
              href="/library"
              icon={<Archive className="h-5 w-5" />}
              label="보관함"
            />
            <MobileTab
              href="/workspace"
              icon={<Users className="h-5 w-5" />}
              label="공유"
            />
            <MobileTab
              href="/subscribe"
              icon={<Crown className="h-5 w-5" />}
              label="구독"
            />
          </div>
        </nav>
      )}
    </>
  );
}
