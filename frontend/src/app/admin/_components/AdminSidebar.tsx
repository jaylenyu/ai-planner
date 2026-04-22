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

const items = [
  { href: '/admin/board', label: '개요', icon: LayoutDashboard },
  { href: '/admin/users', label: '사용자', icon: Users },
  { href: '/admin/billing', label: '구독·결제', icon: CreditCard },
  { href: '/admin/plans', label: '플랜', icon: BarChart3 },
  { href: '/admin/ops/logs', label: '로그', icon: Logs },
  { href: '/admin/ops/cost', label: '비용', icon: WalletCards },
  { href: '/admin/ops/sentry', label: 'Sentry', icon: Shield },
  { href: '/admin/ops/api-usage', label: 'API 사용량', icon: WandSparkles },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-[var(--border-default)] bg-[var(--surface)] lg:h-[calc(100vh-6rem)] lg:rounded-3xl lg:border lg:shadow-[var(--shadow-card)]">
      <div className="shrink-0 border-b border-[var(--border-light)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          AI Planner Admin
        </p>
        <h2 className="mt-1 text-lg font-bold text-stone-900">운영 콘솔</h2>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'relative flex min-h-11 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--brand-50)] text-[var(--brand-600)]'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
              )}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--brand-500)]" />
              )}
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-[var(--border-light)] px-5 py-4">
        <div className="rounded-2xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
          <p className="font-semibold text-stone-900">운영 노트</p>
          <p className="mt-1">모바일에서는 조회용 화면으로만 제공합니다.</p>
        </div>
      </div>
    </div>
  );
}
