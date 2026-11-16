import Link from 'next/link';
import type { Paginated } from '@nexcust/contracts';
import { api, fmtDate, qs } from '@/lib/api';
import { Badge, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

interface Row { id: string; status: string; classification: string; startedAt: string; facility: { name: string }; housingUnit: { name: string } | null;
  prisonerRecord: { prisonerNumber: string; person: { indexNumber: string; surname: string; otherNames: string; sex: string } } }

export default async function Registry({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await api<Paginated<Row>>(`/prisons/prisoners${qs({ q: sp.q, status: sp.status, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Prisoner registry" subtitle="Persons held in establishments within your command (default: currently in custody)" />
      <SearchBar q={sp.q} status={sp.status} statuses={['IN_CUSTODY', 'IN_TRANSIT', 'RELEASED']} placeholder="Search by name or prisoner number" />
      <Table head={['Prisoner no.', 'Name', 'Classification', 'Establishment', 'Housing', 'Admitted', 'Status']} empty={!data.items.length}>
        {data.items.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td><Link className="font-medium text-brand hover:underline" href={`/prisons/prisoners/${r.id}`}>{r.prisonerRecord.prisonerNumber}</Link></td>
            <td>{r.prisonerRecord.person.surname}, {r.prisonerRecord.person.otherNames}<div className="text-xs text-slate-500">{r.prisonerRecord.person.indexNumber}</div></td>
            <td><Badge>{r.classification}</Badge></td><td>{r.facility.name}</td><td>{r.housingUnit?.name ?? '—'}</td><td className="whitespace-nowrap">{fmtDate(r.startedAt)}</td><td><Badge>{r.status}</Badge></td>
          </tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/prisons/prisoners" params={{ q: sp.q, status: sp.status }} />
    </>
  );
}
