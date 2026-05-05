import type { ReactNode } from 'react';
import { AppCard } from '@/components/custom/app-card';
import { cn } from '@/lib/utils';

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <AppCard padding="lg" className={cn('space-y-5', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('space-y-3', contentClassName)}>{children}</div>
    </AppCard>
  );
}
