import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, PageHeader, Stat } from '@/components/ui';
import { GhanaMap, type MapPoint, type MapRegion } from '@/components/ghana-map';
import { ghanaMap } from '@/lib/geo';

const ATTRIBUTION = 'Region boundaries: Ghana Statistical Service via OCHA/HDX (CC BY-IGO). Establishment positions: © OpenStreetMap contributors; some are town centres only. Occupancy counts only establishments with a published capacity.';

interface Dash { population: number; remand: number; convicted: number; admissions30d: number; releases30d: number; personnel: number; capacity: number; occupancyRate: number | null;
  facilities: Array<{ id: string; name: string; type: string; capacity: number | null; population: number; occupancyRate: number | null }> }

export default async function PrisonsDashboard() {
  const [d, remand, map] = await Promise.all([api<Dash>('/prisons/dashboard'), api<any>('/prisons/remand-warrants/attention'), api<{ regions: MapRegion[]; points: MapPoint[]; unmapped: number }>('/prisons/map')]);
  const geo = ghanaMap();
  const expired = remand.rows.filter((r: any) => r.state === 'EXPIRED').length;
  return (
    <>
      <PageHeader title="Prisons dashboard" subtitle={`Live figures for your jurisdiction · ${d.facilities.length} establishment${d.facilities.length === 1 ? '' : 's'} in scope · synthetic records`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Population" value={d.population.toLocaleString()} hint={`Published capacity ${d.capacity.toLocaleString()}`} />
        <Stat label="Occupancy" value={d.occupancyRate === null ? '—' : `${d.occupancyRate}%`} tone={(d.occupancyRate ?? 0) > 100 ? 'alert' : 'default'} />
        <Stat label="Remand" value={d.remand} hint={expired ? `${expired} expired warrant(s) — see Remand Warrants` : 'All remand warrants current'} /><Stat label="Convicted" value={d.convicted} />
        <Stat label="Admissions (30 days)" value={d.admissions30d} /><Stat label="Releases (30 days)" value={d.releases30d} />
      </div>
      {d.facilities.length > 1 && (
        <Card className="mt-6 p-5">
          <div className="mb-4"><h2 className="font-semibold">Establishments map</h2><p className="mt-0.5 text-xs text-slate-500">Your jurisdiction by administrative region. Choose a measure; hover for figures; select a region to see its establishments.{map.unmapped ? ` ${map.unmapped} establishments have no map position yet and count only in the regional totals.` : ''}</p></div>
          <GhanaMap shapes={geo.shapes} projection={geo.projection} regions={map.regions} points={map.points} units={{ one: 'establishment', many: 'establishments' }} attribution={ATTRIBUTION}
            metrics={[{ key: 'population', label: 'Population' }, { key: 'occupancy', label: 'Occupancy', unit: '%' }, { key: 'remand', label: 'On remand' }]} />
        </Card>
      )}
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Occupancy by establishment</h2><Link href="/prisons/facilities" className="text-sm text-brand hover:underline">Facilities & housing →</Link></div>
        <ul className="space-y-2">
          {d.facilities.map((f) => {
            const pct = f.occupancyRate ?? 0;
            return (
              <li key={f.id} className="grid grid-cols-[16rem_1fr_7rem] items-center gap-3 text-sm">
                <span className="truncate">{f.name}</span>
                <span className="h-2 rounded bg-white ring-1 ring-line"><span className={`block h-2 rounded ${pct > 100 ? 'bg-red-600' : 'bg-chart'}`} style={{ width: `${Math.min(100, pct)}%` }} /></span>
                <span className={`text-right tabular-nums ${pct > 100 ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{f.population} / {f.capacity ?? '—'} ({pct}%)</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
