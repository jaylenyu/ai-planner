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
    <div className="flex h-full min-h-0 flex-col bg-white lg:h-[calc(100vh-6rem)]">
      {/* Logo / Brand */}
      <div className="shrink-0 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          AI Planner
        </p>
        <h2 className="mt-0.5 text-base font-bold text-stone-900">운영 콘솔</h2>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            {/* Section header */}
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              {section.title}
            </p>

            {/* Items */}
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex min-h-[38px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                    active
                      ? 'bg-orange-50 font-semibold text-[var(--brand-600)]'
                      : 'font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800',
                  )}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand-500)]" />
                  )}

                  <Icon
                    className={cn(
                      'h-[15px] w-[15px] shrink-0 transition-colors duration-150',
                      active
                        ? 'text-[var(--brand-500)]'
                        : 'text-stone-400 group-hover:text-stone-600',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer note */}
      <div className="shrink-0 border-t border-stone-100 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-stone-400">
          모바일에서는 조회용 화면으로만 제공됩니다.
        </p>
      </div>
    </div>
  );
}
