import * as React from 'react';
import { cn } from '@/lib/utils';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  as?: 'input' | 'textarea';
  rows?: number;
}

const baseInput = [
  'w-full border',
  'bg-[var(--surface-sunken)] px-4 py-3',
  'text-sm placeholder:text-[var(--text-tertiary)]',
  'outline-none transition-all duration-200',
  'focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100',
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

export const InputField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputFieldProps
>(({ label, hint, error, icon, as = 'input', rows, className, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {icon}
          </div>
        )}
        {as === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows ?? 3}
            className={cn(
              baseInput,
              'rounded-[var(--radius-md)] border-[var(--border-default)]',
              icon && 'pl-10',
              'resize-none',
              className,
            )}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            className={cn(
              baseInput,
              'rounded-[var(--radius-md)] border-[var(--border-default)]',
              icon && 'pl-10',
              className,
            )}
            {...props}
          />
        )}
      </div>
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      )}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
});
InputField.displayName = 'InputField';
