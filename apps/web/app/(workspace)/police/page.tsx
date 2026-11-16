import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, PageHeader, Stat } from '@/components/ui';
import { GhanaMap, type MapPoint, type MapRegion } from '@/components/ghana-map';
import { ghanaMap } from '@/lib/geo';

const ATTRIBUTION = 'Region boundaries: Ghana Statistical Service via OCHA/HDX (CC BY-IGO). Station positions: © OpenStreetMap contributors and the Ghana Police Service 2018 station map; some are town centres only.';

interface Dash { scope: string; inCustody: number; pastDeadline: number; arrests30d: number; openCases: number; personnel: number; stations: number; stationsHolding: number;
  custodyByStation: Array<{ id: string; name: string; capacity: number | null; inCustody: number }> }

export default async function PoliceDashboard() {
  const [d, map] = await Promise.all([api<Dash>('/police/dashboard'), api<{ regions: MapRegion[]; points: MapPoint[]; unmapped: number }>('/police/map')]);
  const geo = ghanaMap();
  return (
    <>
      <PageHeader title="Police dashboard" subtitle={`Live figures for your jurisdiction · ${d.stations.toLocaleString()} station${d.stations === 1 ? '' : 's'} in scope · synthetic records`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="In police custody" value={d.inCustody} />
        <Stat label="Past court deadline" value={d.pastDeadline} tone={d.pastDeadline ? 'alert' : 'default'} hint="Held beyond the configured 48-hour rule" />
        <Stat label="Arrests (30 days)" value={d.arrests30d} />
        <Stat label="Open cases" value={d.openCases} />
        <Stat label="Active personnel" value={d.personnel} />
      </div>
      {d.stations > 1 && (
        <Card className="mt-6 p-5">
          <div className="mb-4"><h2 className="font-semibold">Command map</h2><p className="mt-0.5 text-xs text-slate-500">Your jurisdiction by administrative region. Choose a measure; hover for figures; select a region to see its busiest stations.{map.unmapped ? ` ${map.unmapped} stations have no map position yet and count only in the regional totals.` : ''}</p></div>
          <GhanaMap shapes={geo.shapes} projection={geo.projection} regions={map.regions} points={map.points} units={{ one: 'station', many: 'stations' }} attribution={ATTRIBUTION}
            metrics={[{ key: 'inCustody', label: 'In custody' }, { key: 'pastDeadline', label: 'Past 48 hours' }, { key: 'arrests30d', label: 'Arrests, 30 days' }, { key: 'openCases', label: 'Open cases' }]} />
        </Card>
      )}
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">People in custody by station</h2><Link href="/police/custody?status=IN_CUSTODY" className="text-sm text-brand hover:underline">View custody register →</Link></div>
        {d.custodyByStation.length ? (
          <ul className="space-y-2">
            {d.custodyByStation.map((s) => {
              const max = d.custodyByStation[0].inCustody || 1;
              return (
                <li key={s.id} className="grid grid-cols-[minmax(8rem,16rem)_1fr_3rem] items-center gap-3 text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="h-2 rounded bg-white ring-1 ring-line"><span className="block h-2 rounded bg-chart" style={{ width: `${Math.round((s.inCustody / max) * 100)}%` }} /></span>
                  <span className="text-right tabular-nums text-slate-600">{s.inCustody}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">Nobody is in police custody in your jurisdiction.</p>}
        {d.stationsHolding > d.custodyByStation.length && <p className="mt-3 text-xs text-slate-500">The {d.custodyByStation.length} stations holding the most people, of {d.stationsHolding} holding anyone.</p>}
      </Card>
      <p className="mt-4 text-xs text-slate-500">The 48-hour indicator reflects Article 14(3) of the 1992 Constitution as a configurable rule; how the period is counted in practice is flagged for institutional confirmation.</p>
    </>
  );
}
