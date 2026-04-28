'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getAuthUser } from '@/lib/auth';

export function UserMenu() {
  const router = useRouter();
  const { logout } = useAuth();
  const authUser = getAuthUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initial = authUser?.email ? authUser.email[0].toUpperCase() : '?';
  const isAdmin = authUser?.role === 'ADMIN';

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.replace('/login');
  };

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        aria-label="계정 메뉴"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card-hover)] border border-[var(--border-light)] py-1 z-50"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => navigate('/mypage')}
            className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            마이페이지
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => navigate('/settings')}
            className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            설정
          </button>
          {isAdmin && (
            <button
              role="menuitem"
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              관리자
            </button>
          )}
          <div className="my-1 h-px bg-[var(--border-light)]" />
          <button
            role="menuitem"
            type="button"
            onClick={() => void handleLogout()}
            className="w-full px-4 py-2.5 text-left text-sm text-stone-500 hover:bg-stone-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
