import { Spinner } from '@/components/custom/Spinner';

export function AdminLoading({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-stone-500">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}
