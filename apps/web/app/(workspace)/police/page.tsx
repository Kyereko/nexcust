import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, PageHeader, Stat } from '@/components/ui';

interface Dash { scope: string; inCustody: number; pastDeadline: number; arrests30d: number; openCases: number; personnel: number; stations: number;
  custodyByStation: Array<{ id: string; name: string; capacity: number | null; inCustody: number }> }

export default async function PoliceDashboard() {
  const d = await api<Dash>('/police/dashboard');
  return (
    <>
      <PageHeader title="Police dashboard" subtitle={`Live figures for your jurisdiction · ${d.stations} station${d.stations === 1 ? '' : 's'} in scope`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="In police custody" value={d.inCustody} />
        <Stat label="Past court deadline" value={d.pastDeadline} tone={d.pastDeadline ? 'alert' : 'default'} hint="Held beyond the configured 48-hour rule" />
        <Stat label="Arrests (30 days)" value={d.arrests30d} />
        <Stat label="Open cases" value={d.openCases} />
        <Stat label="Active personnel" value={d.personnel} />
      </div>
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Custody by station</h2><Link href="/police/custody?status=IN_CUSTODY" className="text-sm text-brand hover:underline">View custody register →</Link></div>
        <ul className="space-y-2">
          {d.custodyByStation.map((s) => {
            const pct = s.capacity ? Math.min(100, Math.round((s.inCustody / s.capacity) * 100)) : 0;
            return (
              <li key={s.id} className="grid grid-cols-[14rem_1fr_5rem] items-center gap-3 text-sm">
                <span className="truncate">{s.name}</span>
                <span className="h-2 rounded bg-white ring-1 ring-line"><span className="block h-2 rounded bg-chart" style={{ width: `${pct}%` }} /></span>
                <span className="text-right tabular-nums text-slate-600">{s.inCustody} / {s.capacity ?? '—'}</span>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="mt-4 text-xs text-slate-500">The 48-hour indicator reflects Article 14(3) of the 1992 Constitution as a configurable rule; how the period is counted in practice is flagged for institutional confirmation.</p>
    </>
  );
}
