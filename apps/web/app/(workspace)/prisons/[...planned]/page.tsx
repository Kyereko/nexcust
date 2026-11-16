import { notFound } from 'next/navigation';
import { Planned } from '@/components/ui';

const MODULES: Record<string, [string, string, string]> = {
  reports: ['Reports & Analytics', 'Day 4', 'Population, remand/convicted mix, occupancy and movement reporting by establishment, regional command and nationally.'],
};

export default async function Page({ params }: { params: Promise<{ planned: string[] }> }) {
  const m = MODULES[(await params).planned[0]];
  if (!m) notFound();
  return <Planned title={m[0]} day={m[1]} scope={m[2]} />;
}
