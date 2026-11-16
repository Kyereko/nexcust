import type { Paginated } from '@justiceone/contracts';
import { api, fmtDate, qs } from '@/lib/api';
import { Badge, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

interface Row { id: string; caseNumber: string; title: string; offenceCategory: string; status: string; openedAt: string; facility: { name: string }; _count: { charges: number; arrests: number } }

export default async function Cases({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await api<Paginated<Row>>(`/police/cases${qs({ q: sp.q, status: sp.status, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Cases & investigations" subtitle="Case register for stations within your command" />
      <SearchBar q={sp.q} status={sp.status} statuses={['OPEN', 'UNDER_INVESTIGATION', 'FORWARDED_FOR_ADVICE', 'BEFORE_COURT', 'CLOSED']} placeholder="Search by case number or title" />
      <Table head={['Case number', 'Title', 'Station', 'Opened', 'Arrests', 'Charges', 'Status']} empty={!data.items.length}>
        {data.items.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50"><td className="font-medium">{r.caseNumber}</td><td>{r.title}</td><td>{r.facility.name}</td><td className="whitespace-nowrap">{fmtDate(r.openedAt)}</td>
            <td className="tabular-nums">{r._count.arrests}</td><td className="tabular-nums">{r._count.charges}</td><td><Badge>{r.status}</Badge></td></tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/police/cases" params={{ q: sp.q, status: sp.status }} />
    </>
  );
}
