import Link from 'next/link';
import type { Paginated } from '@justiceone/contracts';
import { api, fmtDateTime, qs } from '@/lib/api';
import { Badge, Flash, PageHeader, Pager, SearchBar, Table } from '@/components/ui';
import { BG_STATUSES, bgTone } from '@/lib/status';


export default async function BackgroundChecks({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await api<Paginated<any>>(`/police/background-checks${qs({ q: sp.q, status: sp.status, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Background checks" subtitle="Internal processing of police clearance applications — designed to complement the existing GPS online clearance service" />
      <Flash sp={sp} />
      <SearchBar q={sp.q} status={sp.status} statuses={BG_STATUSES} placeholder="Reference or applicant name" />
      <Table head={['Reference', 'Applicant', 'Purpose', 'Submitted', 'Last updated', 'Status']} empty={!data.items.length}>
        {data.items.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50"><td><Link prefetch={false} className="font-medium text-blue-700 hover:underline" href={`/police/background-checks/${a.id}`}>{a.reference}</Link></td>
            <td>{a.fullName}</td><td>{a.purpose}</td><td className="whitespace-nowrap">{fmtDateTime(a.submittedAt)}</td><td className="whitespace-nowrap">{fmtDateTime(a.updatedAt)}</td><td><Badge tone={bgTone(a.status)}>{a.status}</Badge></td></tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/police/background-checks" params={{ q: sp.q, status: sp.status }} />
    </>
  );
}
