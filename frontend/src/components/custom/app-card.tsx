import * as React from 'react';
import { cn } from '@/lib/utils';

type AppCardVariant = 'default' | 'sunken' | 'ghost' | 'brand-tint';
type AppCardPadding = 'none' | 'sm' | 'md' | 'lg';

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AppCardVariant;
  padding?: AppCardPadding;
  hoverable?: boolean;
}

const paddingMap: Record<AppCardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-5 sm:p-8',
};

const variantMap: Record<AppCardVariant, string> = {
  default: 'app-card',
  sunken: 'bg-[var(--surface-sunken)] border border-[var(--border-light)] rounded-[var(--radius-lg)]',
  ghost: 'border border-[var(--border-light)] rounded-[var(--radius-lg)] bg-transparent',
  'brand-tint': 'bg-section-brand-tint border border-orange-100/60 rounded-[var(--radius-lg)]',
};

export function AppCard({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className,
  children,
  ...props
}: AppCardProps) {
  return (
    <div
      className={cn(
        variantMap[variant],
        paddingMap[padding],
        hoverable &&
          'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 hover:border-[var(--border-default)] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
