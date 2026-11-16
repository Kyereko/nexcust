import { notFound } from 'next/navigation';
import { Planned } from '@/components/ui';

const MODULES: Record<string, [string, string, string]> = {
  'background-checks': ['Background Checks', 'Day 4', 'Internal case processing for clearance requests: validation, identity verification, records search, review and authorized decision, with a verifiable sample certificate. Designed to complement — not replace — the existing Ghana Police e-services clearance portal.'],
  reports: ['Reports & Analytics', 'Day 4', 'Custody, case and personnel reporting aggregated to station, district, division, regional and national level.'],
};

export default async function Page({ params }: { params: Promise<{ planned: string[] }> }) {
  const m = MODULES[(await params).planned[0]];
  if (!m) notFound();
  return <Planned title={m[0]} day={m[1]} scope={m[2]} />;
}
