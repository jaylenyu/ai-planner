import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionLayoutProps {
  id?: string;
  eyebrow?: string;
  heading?: React.ReactNode;
  subheading?: string;
  align?: 'left' | 'center';
  background?: 'white' | 'alt' | 'brand-tint' | 'dark';
  className?: string;
  headingClassName?: string;
  children?: React.ReactNode;
}

const bgMap: Record<NonNullable<SectionLayoutProps['background']>, string> = {
  white: 'bg-[var(--surface-elevated)]',
  alt: 'bg-section-alt',
  'brand-tint': 'bg-section-brand-tint',
  dark: 'bg-[#040306] text-white',
};

export function SectionLayout({
  id,
  eyebrow,
  heading,
  subheading,
  align = 'center',
  background = 'white',
  className,
  headingClassName,
  children,
}: SectionLayoutProps) {
  const isCenter = align === 'center';

  return (
    <section
      id={id}
      className={cn('py-[var(--space-section)]', bgMap[background], className)}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {(eyebrow || heading || subheading) && (
          <div
            className={cn(
              'mb-[var(--space-section-inner)]',
              isCenter ? 'text-center' : 'text-left',
            )}
          >
            {eyebrow && <p className="label-eyebrow mb-3">{eyebrow}</p>}
            {heading && (
              <h2
                className={cn(
                  'text-balance font-extrabold tracking-tight leading-[1.1]',
                  isCenter && 'mx-auto max-w-3xl',
                  headingClassName,
                )}
                style={{ fontSize: 'var(--font-size-h2)', color: 'var(--text-primary)' }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className={cn(
                  'mt-4 leading-relaxed',
                  isCenter ? 'mx-auto max-w-2xl' : 'max-w-2xl',
                )}
                style={{ color: 'var(--text-secondary)' }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
