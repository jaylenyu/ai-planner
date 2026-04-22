import { ArrowRight } from 'lucide-react';

export function AdminPageHeader({
  breadcrumb,
  title,
  description,
}: {
  breadcrumb: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 rounded-[28px] border border-[var(--border-light)] bg-white/80 px-5 py-5 shadow-[var(--shadow-card)] backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
        <span>Admin</span>
        <ArrowRight className="h-3 w-3" />
        <span>{breadcrumb}</span>
      </div>
      <div className="mt-3">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
