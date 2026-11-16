import { notFound } from 'next/navigation';
import { Planned } from '@/components/ui';

const MODULES: Record<string, [string, string, string]> = {
  people: ['People & Records', 'Day 2', 'National Person Index search, identity record creation with duplicate review, and a person\'s police record history (arrests, charges and court-recorded convictions kept as separate facts).'],
  'background-checks': ['Background Checks', 'Day 4', 'Internal case processing for clearance requests: validation, identity verification, records search, review and authorized decision, with a verifiable sample certificate. Designed to complement — not replace — the existing Ghana Police e-services clearance portal.'],
  reports: ['Reports & Analytics', 'Day 4', 'Custody, case and personnel reporting aggregated to station, district, division, regional and national level.'],
};

export default async function Page({ params }: { params: Promise<{ planned: string[] }> }) {
  const m = MODULES[(await params).planned[0]];
  if (!m) notFound();
  return <Planned title={m[0]} day={m[1]} scope={m[2]} />;
}
