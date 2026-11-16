import type { Paginated } from '@justiceone/contracts';
import { api, fmtDateTime, qs } from '@/lib/api';
import { Badge, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await api<Paginated<any>>(`/admin/users${qs({ q: sp.q, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Users & roles" subtitle="Platform administrators manage accounts and jurisdictions; they hold no access to operational records" />
      <SearchBar q={sp.q} placeholder="Search by name or email" />
      <Table head={['User', 'Email', 'Role', 'Jurisdiction (org unit)', 'Last sign-in', 'Status']} empty={!data.items.length}>
        {data.items.map((u) => (
          <tr key={u.id}><td className="font-medium">{u.displayName}</td><td>{u.email}</td><td>{u.roleAssignments.map((a: any) => a.role.name).join(', ')}</td>
            <td>{u.roleAssignments.map((a: any) => a.orgUnit?.name ?? 'Platform').join(', ')}</td><td className="whitespace-nowrap">{fmtDateTime(u.lastLoginAt)}</td><td><Badge>{u.status}</Badge></td></tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/admin" params={{ q: sp.q }} />
    </>
  );
}
