import Link from 'next/link';
import { api, fmtDate } from '@/lib/api';
import { Badge, Card, PageHeader, Table } from '@/components/ui';

const STATE: Record<string, [string, string]> = { EXPIRED: ['EXPIRED', 'red'], EXPIRING: ['EXPIRES ≤ 2 DAYS', 'amber'], NO_RETURN_DATE: ['NO COURT DATE', 'amber'], CURRENT: ['CURRENT', 'green'] };

export default async function RemandWarrants() {
  const r = await api<any>('/prisons/remand-warrants/attention');
  return (
    <>
      <PageHeader title="Remand warrants needing attention" subtitle="Remand prisoners whose latest warrant has expired, is about to expire, or exceeds the remand limit" />
      <Card className="mb-4 p-4 text-sm text-slate-700">
        Adults may be remanded for at most <b>{r.maxClearDays} clear days</b> at a time (Act 30 s.169(2)). Expired warrants are followed up with the police and court for renewal or production.
        <b> No one is released automatically</b>: release requires a court document or the end of a sentence.
      </Card>
      <Table head={['Prisoner', 'Establishment', 'Latest warrant', 'Next court date', 'Status']} empty={!r.rows.length}>
        {r.rows.map((x: any) => (
          <tr key={x.episodeId}><td><Link prefetch={false} className="font-medium text-brand hover:underline" href={`/prisons/prisoners/${x.episodeId}`}>{x.prisonerNumber}</Link><div className="text-xs text-slate-500">{x.name}</div></td>
            <td>{x.establishment}</td><td>{x.warrant ? `${x.warrant.orderRef} · ${x.warrant.court}` : '—'}</td><td className="whitespace-nowrap">{fmtDate(x.warrant?.returnDate)}</td>
            <td><Badge tone={STATE[x.state][1]}>{STATE[x.state][0]}</Badge>{x.exceedsClearDays && <> <Badge tone="amber">EXCEEDS LIMIT</Badge></>}</td></tr>
        ))}
      </Table>
    </>
  );
}
