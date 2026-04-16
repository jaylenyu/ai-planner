'use client';

import { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  containerClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  containerClassName,
  panelClassName,
  bodyClassName,
}: DialogProps) {
  useLayoutEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    // 스크롤 위치를 고정하되, overflow나 scrollbar를 건드리지 않음
    const scrollY = window.scrollY;
    const { body } = document;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      window.scrollTo(0, scrollY);
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 animate-fade-in-fast bg-black/45 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'relative mx-auto flex min-h-full max-w-2xl items-center justify-center px-4 py-6',
          containerClassName,
        )}
      >
        <div
          className={cn(
            'w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl animate-scale-in-fast will-change-transform',
            panelClassName,
          )}
        >
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
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className={cn('px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
