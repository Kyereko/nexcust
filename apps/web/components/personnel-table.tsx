import type { Paginated } from '@nexcust/contracts';
import { api, qs } from '@/lib/api';
import Link from 'next/link';
import { Badge, LinkButton, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

interface Row { id: string; serviceNumber: string; surname: string; otherNames: string; status: string; currentRank: { name: string; abbreviation: string | null };
  currentOrgUnit: { name: string; type: { name: string } }; commands: Array<{ acting: boolean; appointment: { title: string } }> }

/** Shared presentation only — each institution has its own API endpoint, permission and data. */
export async function PersonnelTable({ institution, sp }: { institution: 'police' | 'prisons'; sp: Record<string, string | undefined> }) {
  const data = await api<Paginated<Row>>(`/${institution}/personnel${qs({ q: sp.q, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Personnel & postings" subtitle="Rank, appointment and posting are recorded separately"><LinkButton href={`/${institution}/postings`}>Postings in progress</LinkButton></PageHeader>
      <SearchBar q={sp.q} placeholder="Search by name or service number" />
      <Table head={['Service no.', 'Name', 'Rank (substantive)', 'Appointment', 'Posting (unit)', 'Status']} empty={!data.items.length}>
        {data.items.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50"><td className="font-medium"><Link prefetch={false} className={`${institution === 'police' ? 'text-brand' : 'text-brand'} hover:underline`} href={`/${institution}/personnel/${r.id}`}>{r.serviceNumber}</Link></td><td>{r.surname}, {r.otherNames}</td>
            <td>{r.currentRank.name}{r.currentRank.abbreviation ? <span className="text-slate-500"> ({r.currentRank.abbreviation})</span> : null}</td>
            <td>{r.commands.length ? r.commands.map((c) => `${c.acting ? 'Ag. ' : ''}${c.appointment.title}`).join(', ') : <span className="text-slate-400">—</span>}</td>
            <td>{r.currentOrgUnit.name}<div className="text-xs text-slate-500">{r.currentOrgUnit.type.name}</div></td><td><Badge>{r.status}</Badge></td></tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base={`/${institution}/personnel`} params={{ q: sp.q }} />
    </>
  );
}
