import { AppCard } from '@/components/ui/app-card';

export function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <AppCard padding="lg" className="space-y-2">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      {detail && <p className="text-xs text-stone-500">{detail}</p>}
    </AppCard>
  );
}
