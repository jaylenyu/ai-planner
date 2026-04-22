'use client';

import { Menu, UserCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';

export function AdminTopBar({
  adminEmail,
  adminReadOnly,
  onMenuClick,
}: {
  adminEmail: string;
  adminReadOnly: boolean;
  onMenuClick: () => void;
}) {
  const handleLogout = async () => {
    await authApi.logoutAdmin();
    localStorage.removeItem('ai_planner_admin_token');
    localStorage.removeItem('ai_planner_admin_refresh');
    window.location.href = '/admin/login';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-light)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[56px] max-w-[1600px] items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-white text-stone-700 lg:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-bold text-stone-900">AI Planner Admin</p>
            <p className="text-xs text-stone-500">TossPayments Docs 스타일 운영 대시보드</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-white px-2 py-1.5 text-sm text-stone-700 shadow-sm">
          <UserCircle2 className="h-4 w-4 text-[var(--brand-600)]" />
          <span className="hidden max-w-[220px] truncate sm:inline">{adminEmail}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
              adminReadOnly
                ? 'bg-stone-100 text-stone-500'
                : 'bg-orange-50 text-orange-600'
            }`}
          >
            {adminReadOnly ? '읽기 전용' : '전체 권한'}
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="ml-2 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-200"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
