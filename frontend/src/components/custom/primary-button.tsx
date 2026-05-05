import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'brand' | 'outline' | 'ghost-dark';
  asChild?: boolean;
  loading?: boolean;
}

const sizeMap: Record<NonNullable<PrimaryButtonProps['size']>, string> = {
  sm: 'h-9 px-5 text-sm gap-1.5',
  md: 'h-11 px-6 text-sm gap-2',
  lg: 'h-13 px-8 text-base gap-2.5',
};

const variantMap: Record<NonNullable<PrimaryButtonProps['variant']>, string> = {
  brand: 'btn-brand border-0',
  outline:
    'bg-transparent border border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-pill)] hover:border-orange-300 hover:text-orange-600 transition-colors duration-200 font-semibold',
  'ghost-dark':
    'bg-white/15 text-white border border-white/25 rounded-[var(--radius-pill)] hover:bg-white/25 transition-colors duration-200 font-semibold',
};

export function PrimaryButton({
  size = 'md',
  variant = 'brand',
  asChild = false,
  loading = false,
  className,
  disabled,
  children,
  ...props
}: PrimaryButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-semibold',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeMap[size],
        variantMap[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </Comp>
  );
}
