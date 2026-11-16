import Link from 'next/link';
import type { Paginated } from '@justiceone/contracts';
import { api, fmtDateTime, getSession, qs } from '@/lib/api';
import { Badge, Button, Flash, PageHeader, Pager, SearchBar, Table } from '@/components/ui';
import { decidePosting } from '../actions';

export default async function Postings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const user = (await getSession())!;
  const data = await api<Paginated<any>>(`/prisons/postings${qs({ status: sp.status, page: sp.page })}`);
  const canDecide = user.permissions.includes('prisons.posting.approve');
  return (
    <>
      <Link href="/prisons/personnel" className="text-sm text-green-800 hover:underline">← Personnel & postings</Link>
      <PageHeader title="Postings" subtitle="Proposed → approved by the releasing command → confirmed by the receiving command" />
      <Flash sp={sp} />
      <SearchBar placeholder="(filter by status)" status={sp.status} statuses={['PROPOSED', 'APPROVED', 'CONFIRMED', 'ENDED', 'REJECTED']} />
      <Table head={['Officer', 'From', 'To', 'Reason', 'Proposed', 'Status', '']} empty={!data.items.length}>
        {data.items.map((p) => (
          <tr key={p.id}><td><Link prefetch={false} className="font-medium text-green-800 hover:underline" href={`/prisons/personnel/${p.personnel.id}`}>{p.personnel.serviceNumber}</Link><div className="text-xs text-slate-500">{p.personnel.currentRank.abbreviation ?? p.personnel.currentRank.name} {p.personnel.surname}, {p.personnel.otherNames}</div></td>
            <td>{p.fromOrgUnit?.name ?? '—'}</td><td className="font-medium">{p.toOrgUnit.name}</td><td>{p.reason}</td><td className="whitespace-nowrap">{fmtDateTime(p.createdAt)}</td><td><Badge tone={p.status === 'PROPOSED' ? 'amber' : p.status === 'APPROVED' ? 'blue' : undefined}>{p.status}</Badge></td>
            <td className="text-right">{canDecide && ['PROPOSED', 'APPROVED'].includes(p.status) && (
              <div className="flex justify-end gap-2">
                <form action={decidePosting}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value={p.status === 'PROPOSED' ? 'approve' : 'confirm'} /><Button>{p.status === 'PROPOSED' ? 'Approve' : 'Confirm arrival'}</Button></form>
                <form action={decidePosting}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="reject" /><Button tone="secondary">Reject</Button></form>
              </div>
            )}</td></tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/prisons/postings" params={{ status: sp.status }} />
    </>
  );
}
