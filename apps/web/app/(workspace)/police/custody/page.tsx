import Link from 'next/link';
import type { Paginated } from '@justiceone/contracts';
import { api, fmtDateTime, getSession, qs } from '@/lib/api';
import { Badge, LinkButton, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

interface Row { id: string; reference: string; status: string; detainedAt: string; courtDeadlineAt: string | null; cellRef: string | null;
  person: { indexNumber: string; surname: string; otherNames: string; sex: string }; facility: { name: string }; arrest: { reference: string; suspectedOffence: string } }
const STATUSES = ['IN_CUSTODY', 'RELEASED_ON_BAIL', 'TRANSFERRED_TO_COURT', 'REMANDED_TO_PRISON', 'RELEASED_NO_CHARGE'];

export default async function CustodyRegister({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await api<Paginated<Row>>(`/police/custody${qs({ q: sp.q, status: sp.status, page: sp.page })}`);
  const now = Date.now();
  return (
    <>
      <PageHeader title="Arrests & custody" subtitle="Custody register for stations within your command">{(await getSession())!.permissions.includes('police.custody.write') && <LinkButton href="/police/custody/new">Register arrest</LinkButton>}</PageHeader>
      <SearchBar q={sp.q} status={sp.status} statuses={STATUSES} placeholder="Search by name or person index number" />
      <Table head={['Reference', 'Person', 'Suspected offence', 'Station', 'Detained', 'Court deadline', 'Status']} empty={!data.items.length}>
        {data.items.map((r) => {
          const overdue = r.status === 'IN_CUSTODY' && r.courtDeadlineAt && new Date(r.courtDeadlineAt).getTime() < now;
          return (
            <tr key={r.id} className="hover:bg-slate-50">
              <td><Link className="font-medium text-blue-700 hover:underline" href={`/police/custody/${r.id}`}>{r.reference}</Link></td>
              <td>{r.person.surname}, {r.person.otherNames}<div className="text-xs text-slate-500">{r.person.indexNumber}</div></td>
              <td>{r.arrest.suspectedOffence}</td><td>{r.facility.name}</td><td className="whitespace-nowrap">{fmtDateTime(r.detainedAt)}</td>
              <td className={`whitespace-nowrap ${overdue ? 'font-semibold text-red-700' : ''}`}>{fmtDateTime(r.courtDeadlineAt)}{overdue ? ' · overdue' : ''}</td>
              <td><Badge>{r.status}</Badge></td>
            </tr>
          );
        })}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/police/custody" params={{ q: sp.q, status: sp.status }} />
    </>
  );
}
