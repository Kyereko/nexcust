import type { Paginated } from '@nexcust/contracts';
import { api, fmtDateTime, getSession, qs } from '@/lib/api';
import { Badge, Card, Flash, PageHeader, Pager, SearchBar, Table } from '@/components/ui';
import { InviteForm, ResendButton } from './invite-forms';
import { revoke, setStatus } from './actions';

const STATE_TONE: Record<string, string> = { PENDING: 'amber', ACCEPTED: 'green', REVOKED: 'slate', EXPIRED: 'slate' };
const EMAIL_LABEL: Record<string, string> = { SENT: 'Emailed', NOT_CONFIGURED: 'Link copied by admin', FAILED: 'Email failed' };

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [me, data, invitations, meta] = await Promise.all([
    getSession().then((u) => u!),
    api<Paginated<any>>(`/admin/users${qs({ q: sp.q, page: sp.page })}`),
    api<Paginated<any>>(`/admin/invitations${qs({ page: sp.ipage, pageSize: '10' })}`),
    api<{ emailConfigured: boolean; profiles: Array<{ code: string; name: string; description: string }> }>('/admin/invitations/meta'),
  ]);
  return (
    <>
      <PageHeader title="Users & access" subtitle="Invite people to evaluate NEXCUST and manage their accounts. Administrators hold no access to operational records." />
      <Flash sp={sp} />

      <Card className="mb-8 p-5">
        <h2 className="text-base font-semibold text-brand">Invite someone</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          They receive a single-use link to choose their own password; no password is ever sent.
          {!meta.emailConfigured && ' Email sending is not switched on yet, so you will get the link to send yourself.'}
        </p>
        <InviteForm profiles={meta.profiles} />
      </Card>

      <h2 className="mb-3 text-base font-semibold text-brand">Invitations</h2>
      <Table head={['Name', 'Email', 'Access', 'Invited by', 'Status', 'Delivery', 'Expires', '']} empty={!invitations.items.length}>
        {invitations.items.map((i) => (
          <tr key={i.id} className="align-top">
            <td className="font-medium">{i.displayName}</td><td>{i.email}</td><td>{i.accessName}</td><td>{i.invitedBy.displayName}</td>
            <td><Badge tone={STATE_TONE[i.state]}>{i.state}</Badge></td>
            <td className="whitespace-nowrap text-xs text-slate-600">{EMAIL_LABEL[i.emailStatus] ?? '—'}</td>
            <td className="whitespace-nowrap">{i.state === 'ACCEPTED' ? `Joined ${fmtDateTime(i.acceptedAt)}` : fmtDateTime(i.expiresAt)}</td>
            <td className="min-w-40">
              {(i.state === 'PENDING' || i.state === 'EXPIRED') && <ResendButton id={i.id} email={i.email} />}
              {i.state === 'PENDING' && (
                <form action={revoke} className="mt-1"><input type="hidden" name="id" value={i.id} /><input type="hidden" name="email" value={i.email} />
                  <button className="text-xs font-medium text-red-700 underline underline-offset-2">Withdraw</button></form>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pager total={invitations.total} page={invitations.page} pageSize={invitations.pageSize} base="/admin" params={{ q: sp.q, page: sp.page, ipage: undefined }} pageParam="ipage" />

      <h2 className="mb-3 mt-8 text-base font-semibold text-brand">Accounts</h2>
      <SearchBar q={sp.q} placeholder="Search by name or email" />
      <Table head={['Person', 'Role and jurisdiction', 'Last sign-in', 'Status', '']} empty={!data.items.length}>
        {data.items.map((u) => (
          <tr key={u.id}>
            <td><div className="font-medium">{u.displayName}</div><div className="text-xs text-slate-500">{u.email}</div></td>
            <td>{u.roleAssignments.map((a: any, k: number) => <div key={k}>{a.role.name}<span className="text-xs text-slate-500"> · {a.orgUnit?.name ?? 'Platform'}</span></div>)}</td>
            <td className="whitespace-nowrap">{fmtDateTime(u.lastLoginAt)}</td><td><Badge>{u.status}</Badge></td>
            <td className="whitespace-nowrap">
              {u.id !== me.id && (
                <form action={setStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="email" value={u.email} />
                  <input type="hidden" name="status" value={u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'} />
                  <button className={`text-xs font-medium underline underline-offset-2 ${u.status === 'ACTIVE' ? 'text-red-700' : 'text-brand'}`}>{u.status === 'ACTIVE' ? 'Suspend' : 'Restore'}</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/admin" params={{ q: sp.q, ipage: sp.ipage }} />
    </>
  );
}
