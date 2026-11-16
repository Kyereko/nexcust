import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, PageHeader, Stat } from '@/components/ui';

interface Dash { population: number; remand: number; convicted: number; admissions30d: number; releases30d: number; personnel: number; capacity: number; occupancyRate: number | null;
  facilities: Array<{ id: string; name: string; type: string; capacity: number | null; population: number; occupancyRate: number | null }> }

export default async function PrisonsDashboard() {
  const d = await api<Dash>('/prisons/dashboard');
  return (
    <>
      <PageHeader title="Prisons dashboard" subtitle={`Live figures for your jurisdiction · ${d.facilities.length} establishment${d.facilities.length === 1 ? '' : 's'} in scope`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Population" value={d.population} hint={`Authorized capacity ${d.capacity}`} />
        <Stat label="Occupancy" value={d.occupancyRate === null ? '—' : `${d.occupancyRate}%`} tone={(d.occupancyRate ?? 0) > 100 ? 'alert' : 'default'} />
        <Stat label="Remand" value={d.remand} /><Stat label="Convicted" value={d.convicted} />
        <Stat label="Admissions (30 days)" value={d.admissions30d} /><Stat label="Releases (30 days)" value={d.releases30d} />
      </div>
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Occupancy by establishment</h2><Link href="/prisons/facilities" className="text-sm text-green-800 hover:underline">Facilities & housing →</Link></div>
        <ul className="space-y-2">
          {d.facilities.map((f) => {
            const pct = f.occupancyRate ?? 0;
            return (
              <li key={f.id} className="grid grid-cols-[16rem_1fr_7rem] items-center gap-3 text-sm">
                <span className="truncate">{f.name}</span>
                <span className="h-2 rounded bg-slate-100"><span className={`block h-2 rounded ${pct > 100 ? 'bg-red-600' : 'bg-prisons'}`} style={{ width: `${Math.min(100, pct)}%` }} /></span>
                <span className={`text-right tabular-nums ${pct > 100 ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{f.population} / {f.capacity ?? '—'} ({pct}%)</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
