import { notFound } from 'next/navigation';
import { Planned } from '@/components/ui';

const MODULES: Record<string, [string, string, string]> = {
  admissions: ['Admissions & Custody', 'Day 3', 'Admission against a verified remand or committal warrant, identity check against the National Person Index, housing assignment and registry update.'],
  transfers: ['Transfers & Releases', 'Day 3', 'Maker–checker transfer and release workflows: legal authority recorded, approval by an authorized officer, confirmation by the receiving establishment, full history preserved.'],
  rehabilitation: ['Rehabilitation', 'Day 3', 'Programme catalogue per establishment and prisoner enrollment tracking.'],
  reports: ['Reports & Analytics', 'Day 4', 'Population, remand/convicted mix, occupancy and movement reporting by establishment, regional command and nationally.'],
};

export default async function Page({ params }: { params: Promise<{ planned: string[] }> }) {
  const m = MODULES[(await params).planned[0]];
  if (!m) notFound();
  return <Planned title={m[0]} day={m[1]} scope={m[2]} />;
}
