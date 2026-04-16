import { redirect } from 'next/navigation';

export default async function LegacyPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/library/plans/${id}`);
}
