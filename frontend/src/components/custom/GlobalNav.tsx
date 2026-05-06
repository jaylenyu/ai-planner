"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getAuthUser } from "@/lib/auth";
import { AppLogo } from "@/components/custom/AppLogo";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { UserMenu } from "@/components/user/UserMenu";
import {
  LayoutDashboard,
  CalendarPlus,
  Archive,
  Users,
  LogOut,
  Crown,
  User,
  Settings,
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
  const isWorkspaceRoute =
    href === "/workspace" &&
    (pathname === "/workspace" || pathname.startsWith("/workspace/plans/"));
  const isWorkspaceSettingsRoute =
    href === "/workspace/settings" && pathname.startsWith("/workspace/settings");
  const isActive =
    isLibraryRoute ||
    isWorkspaceRoute ||
    isWorkspaceSettingsRoute ||
    (href !== "/workspace" &&
      href !== "/workspace/settings" &&
      (pathname === href || pathname.startsWith(href + "/")));

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
  const isWorkspaceRoute =
    href === "/workspace" &&
    (pathname === "/workspace" || pathname.startsWith("/workspace/plans/"));
  const isWorkspaceSettingsRoute =
    href === "/workspace/settings" && pathname.startsWith("/workspace/settings");
  const isActive =
    isLibraryRoute ||
    isWorkspaceRoute ||
    isWorkspaceSettingsRoute ||
    (href !== "/workspace" &&
      href !== "/workspace/settings" &&
      (pathname === href || pathname.startsWith(href + "/")));

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center transition-colors ${
        isActive ? "text-orange-600" : "text-stone-400"
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </Link>
  );
}

export function GlobalNav() {
  const router = useRouter();
  const { isLoggedIn, hydrated, logout } = useAuth();
  const pathname = usePathname();
  const authUser = getAuthUser();
  const isAdmin = authUser?.role === 'ADMIN';
  const showMarketingLinks = !isLoggedIn && pathname === "/";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      {/* Top header */}
      <header
        className="sticky top-0 z-50 glass"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4 sm:px-6">
          <AppLogo size="md" showSubtitle />

          {/* 모바일: 알림 + 마이페이지 + 로그아웃 */}
          <div className="flex items-center gap-1 sm:hidden">
            {/* CLS 방지: hydration 전에 동일한 크기의 placeholder 렌더링 */}
            {!hydrated ? (
              <>
                <div className="h-11 w-11" />
                <div className="h-11 w-11" />
                <div className="h-11 w-11" />
              </>
            ) : isLoggedIn ? (
              <>
                <NotificationBell />
                <button
                  type="button"
                  onClick={() => router.push('/mypage')}
                  className="flex items-center justify-center h-11 w-11 rounded-full text-stone-400 active:bg-stone-100 transition-colors"
                  aria-label="마이페이지"
                >
                  <User className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center h-11 w-11 rounded-full text-stone-400 active:bg-stone-100 transition-colors"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                {showMarketingLinks && (
                  <Link
                    href="/#features"
                    className="flex items-center px-3 h-11 text-sm font-medium text-stone-500 active:text-stone-800 transition-colors"
                  >
                    기능
                  </Link>
                )}
                <Link
                  href="/login"
                  className="flex items-center px-3 h-11 text-sm font-medium text-stone-500 active:text-stone-800 transition-colors"
                >
                  로그인
                </Link>
              </>
            )}
          </div>

          {/* 데스크톱 메뉴 */}
          <nav className="hidden items-center gap-5 sm:flex">
            {!hydrated ? null : isLoggedIn ? (
              <>
                <NotificationBell />
                <NavLink href="/dashboard">대시보드</NavLink>
                <NavLink href="/plan">일정 만들기</NavLink>
                <NavLink href="/library">보관함</NavLink>
                <NavLink href="/workspace">커플 플랜</NavLink>
                <NavLink href="/workspace/settings">공유설정</NavLink>
                {isAdmin && <NavLink href="/admin">관리자</NavLink>}
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
            {!hydrated ? null : isLoggedIn ? (
              <UserMenu />
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
      {hydrated && isLoggedIn && (
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
              label="플랜"
            />
            <MobileTab
              href="/workspace/settings"
              icon={<Settings className="h-5 w-5" />}
              label="공유설정"
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
