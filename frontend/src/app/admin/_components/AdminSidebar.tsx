'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: '대시보드',
    items: [{ href: '/admin/board', label: '개요' }],
  },
  {
    title: '유저 관리',
    items: [
      { href: '/admin/users', label: '사용자' },
      { href: '/admin/billing', label: '구독·결제' },
      { href: '/admin/plans', label: '플랜' },
    ],
  },
  {
    title: '운영',
    items: [
      { href: '/admin/ops/logs', label: '로그' },
      { href: '/admin/ops/cost', label: '비용' },
      { href: '/admin/ops/sentry', label: 'Sentry' },
      { href: '/admin/ops/api-usage', label: 'API 사용량' },
    ],
  },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: '#17171B' }}>
      {/* Brand */}
      <div className="shrink-0 px-5 pt-6 pb-4">
        <p className="text-[11px] font-medium tracking-[0.06em]" style={{ color: '#6B6B72' }}>
          AI Planner
        </p>
        <p className="mt-0.5 text-[13px] font-semibold" style={{ color: '#E8E8ED' }}>
          운영 콘솔
        </p>
      </div>

      <div className="mx-4 shrink-0" style={{ height: '1px', background: '#2C2C30' }} />

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            <p
              className="px-3 pb-1 pt-3 text-[11px] font-medium"
              style={{ color: '#5A5A62', letterSpacing: '0.04em' }}
            >
              {section.title}
            </p>

            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'relative flex h-9 items-center rounded-md px-3 text-[13px] transition-colors duration-100',
                    active
                      ? 'font-semibold'
                      : 'font-normal',
                  )}
                  style={
                    active
                      ? { color: '#3182F6', background: 'rgba(49,130,246,0.10)' }
                      : { color: '#9E9EA6' }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#C8C8D0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = '';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#9E9EA6';
                    }
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                      style={{ width: '3px', height: '60%', background: '#3182F6' }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 px-5 py-4"
        style={{ borderTop: '1px solid #2C2C30' }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: '#5A5A62' }}>
          모바일에서는 조회용 화면으로만 제공됩니다.
        </p>
      </div>
    </div>
  );
}
