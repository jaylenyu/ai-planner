import Link from 'next/link';

const PIN_PATHS = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </>
);

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { box: string; icon: string; text: string; sub: string }> = {
  sm: { box: 'h-8 w-8 rounded-xl', icon: 'h-4 w-4', text: 'text-base font-bold', sub: 'text-[10px]' },
  md: { box: 'h-9 w-9 rounded-xl', icon: 'h-5 w-5', text: 'text-lg font-bold', sub: 'text-[11px]' },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 'h-6 w-6', text: 'text-2xl font-extrabold', sub: 'text-xs' },
};

interface AppLogoProps {
  size?: Size;
  showSubtitle?: boolean;
  href?: string;
  className?: string;
}

export function AppLogo({ size = 'md', showSubtitle, href = '/', className = '' }: AppLogoProps) {
  const s = SIZE[size];

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 group ${className}`}>
      <div
        className={`flex items-center justify-center ${s.box} transition-all duration-300`}
        style={{
          background: 'var(--gradient-brand)',
          boxShadow: 'var(--shadow-brand)',
        }}
      >
        <svg
          className={`${s.icon} text-white`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          {PIN_PATHS}
        </svg>
      </div>
      {showSubtitle ? (
        <div>
          <p className={`${s.text} tracking-tight`} style={{ color: 'var(--text-primary)' }}>
            DatePlanner
          </p>
          <p className={`${s.sub} -mt-0.5 font-medium`} style={{ color: 'var(--text-tertiary)' }}>
            AI 일정 플래너
          </p>
        </div>
      ) : (
        <span className={`${s.text} tracking-tight`} style={{ color: 'var(--text-primary)' }}>
          DatePlanner
        </span>
      )}
    </Link>
  );
}
