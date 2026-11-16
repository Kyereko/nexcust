import type { Paginated } from '@justiceone/contracts';
import { api, fmtDateTime, qs } from '@/lib/api';
import { Badge, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await api<Paginated<any>>(`/audit/events${qs({ q: sp.q, status: sp.status, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Audit trail" subtitle="Append-only record of sign-ins, record access and every refused request" />
      <SearchBar q={sp.q} status={sp.status} statuses={['SUCCESS', 'DENIED', 'FAILURE']} placeholder="Search by action or user email" />
      <Table head={['When', 'Actor', 'Institution', 'Action', 'Permission / entity', 'Request', 'Outcome']} empty={!data.items.length}>
        {data.items.map((e) => (
          <tr key={e.id}><td className="whitespace-nowrap">{fmtDateTime(e.occurredAt)}</td><td>{e.actorEmail ?? 'system'}</td><td>{e.institution ?? '—'}</td><td className="font-medium">{e.action}</td>
            <td className="text-xs text-slate-600">{e.permission ?? e.entityType ?? '—'}{e.detail?.reason ? ` · ${e.detail.reason}` : ''}</td><td className="text-xs text-slate-500">{e.requestMethod} {e.requestPath}</td><td><Badge>{e.outcome}</Badge></td></tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/audit" params={{ q: sp.q, status: sp.status }} />
    </>
  );
}
