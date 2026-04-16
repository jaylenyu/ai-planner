'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative mx-auto flex min-h-full max-w-2xl items-end justify-center px-4 py-6 sm:items-center">
        <div className="w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
            <div>
              {title && (
                <h2 className="text-lg font-bold text-stone-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-stone-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                'rounded-full border border-stone-200 px-3 py-1 text-sm font-medium text-stone-600 transition-colors',
                'hover:border-orange-200 hover:text-orange-600',
              )}
            >
              닫기
            </button>
          </div>
          <div className="px-5 py-5 sm:px-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
