'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Logs,
  Shield,
  Users,
  WalletCards,
  WandSparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: '대시보드',
    items: [{ href: '/admin/board', label: '개요', icon: LayoutDashboard }],
  },
  {
    title: '유저 관리',
    items: [
      { href: '/admin/users', label: '사용자', icon: Users },
      { href: '/admin/billing', label: '구독·결제', icon: CreditCard },
      { href: '/admin/plans', label: '플랜', icon: BarChart3 },
    ],
  },
  {
    title: '운영',
    items: [
      { href: '/admin/ops/logs', label: '로그', icon: Logs },
      { href: '/admin/ops/cost', label: '비용', icon: WalletCards },
      { href: '/admin/ops/sentry', label: 'Sentry', icon: Shield },
      { href: '/admin/ops/api-usage', label: 'API 사용량', icon: WandSparkles },
    ],
  },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Brand */}
      <div className="shrink-0 px-4 pb-3 pt-5">
        <p className="text-[11px] font-medium text-stone-400">AI Planner</p>
        <p className="mt-0.5 text-sm font-bold text-stone-900">운영 콘솔</p>
      </div>

      <div className="mx-0 shrink-0 border-t border-stone-100" />

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            {/* Section header */}
            <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              {section.title}
            </p>

            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex h-9 items-center gap-2.5 pl-4 pr-3 text-[13px] transition-colors duration-100',
                    active
                      ? 'font-semibold text-[var(--brand-600)]'
                      : 'font-normal text-stone-600 hover:text-stone-900',
                  )}
                >
                  {/* Active: full-height left border, no background */}
                  {active && (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--brand-500)]" />
                  )}
                  <Icon
                    className={cn(
                      'h-[15px] w-[15px] shrink-0',
                      active
                        ? 'text-[var(--brand-500)]'
                        : 'text-stone-400 group-hover:text-stone-600',
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-stone-100" />

      {/* Footer */}
      <div className="shrink-0 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-stone-400">
          모바일에서는 조회용 화면으로만 제공됩니다.
        </p>
      </div>
    </div>
  );
}
