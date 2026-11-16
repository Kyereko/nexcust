import { api, qs } from '@/lib/api';
import { Badge, PageHeader, Pager, Table } from '@/components/ui';

interface Row { id: string; code: string; name: string; town: string | null; type: string; district: string | null; division: string | null; command: string | null; status: string; source: string | null; mapped: string | null; inCustody: number }
interface Directory { items: Row[]; total: number; page: number; pageSize: number; commands: Array<{ name: string; path: string }> }

const MAPPED: Record<string, string> = { STATION: 'Station point', OFFICIAL_MAP: 'Service map point', TOWN: 'Town only' };

export default async function Stations({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const d = await api<Directory>(`/police/stations/directory${qs({ q: sp.q, command: sp.command, page: sp.page, pageSize: '50' })}`);
  return (
    <>
      <PageHeader title="Stations & commands" subtitle="Every station and post in your jurisdiction, from the Service's published regional pages, with its command chain and evidence status" />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Station or town" aria-label="Search" className="w-64 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
        {d.commands.length > 1 && (
          <select name="command" defaultValue={sp.command ?? ''} aria-label="Regional command" className="rounded-md border border-line bg-white px-3 py-2 text-sm">
            <option value="">All regional commands</option>
            {d.commands.map((c) => <option key={c.path} value={c.path}>{c.name}</option>)}
          </select>
        )}
        <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">Search</button>
      </form>
      <Table head={['Station', 'District', 'Division', 'Regional command', 'In custody', 'Map', 'Evidence']} empty={!d.items.length}>
        {d.items.map((r) => (
          <tr key={r.id}>
            <td><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.code}{r.town ? ` · ${r.town}` : ''}</div></td>
            <td>{r.district ?? '—'}</td><td>{r.division ?? '—'}</td><td>{r.command ?? '—'}</td>
            <td className="tabular-nums">{r.inCustody}</td>
            <td className="whitespace-nowrap text-xs text-slate-600">{r.mapped ? MAPPED[r.mapped] ?? r.mapped : 'Not mapped'}</td>
            <td><span title={r.source ?? undefined}><Badge tone={r.status === 'VERIFIED' ? 'green' : 'amber'}>{r.status}</Badge></span></td>
          </tr>
        ))}
      </Table>
      <Pager total={d.total} page={d.page} pageSize={d.pageSize} base="/police/stations" params={{ q: sp.q, command: sp.command }} />
      <p className="mt-4 text-xs text-slate-500">VERIFIED: read on the Service&apos;s own regional page (November 2026). PROVISIONAL: found only in OpenStreetMap or the Service&apos;s superseded 2018 directory. Where a page did not name a station&apos;s district or division, the station sits directly under the next unit up. Map points: © OpenStreetMap contributors.</p>
    </>
  );
}
