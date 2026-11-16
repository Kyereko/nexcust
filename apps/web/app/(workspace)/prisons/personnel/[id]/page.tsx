import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, Label, PageHeader, Table, inputCls } from '@/components/ui';
import { proposePosting } from '../../actions';

export default async function Officer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!;
  const p = await api<any>(`/prisons/personnel/${id}`);
  const canPost = user.permissions.includes('prisons.personnel.write');
  const units = canPost ? await api<any[]>('/prisons/org-units') : [];
  const pending = p.postings.find((x: any) => ['PROPOSED', 'APPROVED'].includes(x.status));
  return (
    <>
      <Link href="/prisons/personnel" className="text-sm text-brand hover:underline">← Personnel & postings</Link>
      <PageHeader title={`${p.surname}, ${p.otherNames}`} subtitle={`Service no. ${p.serviceNumber}`}><Badge>{p.status}</Badge></PageHeader>
      <Flash sp={sp} />
      <Card className="p-5"><dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field label="Rank (substantive)">{p.currentRank.name}</Field>
        <Field label="Appointment">{p.commands.filter((c: any) => !c.effectiveTo).map((c: any) => `${c.acting ? 'Ag. ' : ''}${c.appointment.title}, ${c.orgUnit.name}`).join('; ') || 'None'}</Field>
        <Field label="Current posting">{p.currentOrgUnit.name}<div className="text-xs text-slate-500">{p.currentOrgUnit.type.name}</div></Field>
        <Field label="Enlisted">{fmtDate(p.enlistmentDate)}</Field>
      </dl></Card>
      <h2 className="mb-2 mt-6 font-semibold">Posting history</h2>
      <Table head={['From', 'To', 'Reason', 'Effective from', 'Effective to', 'Status']}>
        {p.postings.map((x: any) => <tr key={x.id}><td>{x.fromOrgUnit?.name ?? '—'}</td><td className="font-medium">{x.toOrgUnit.name}</td><td>{x.reason ?? '—'}</td><td className="whitespace-nowrap">{fmtDateTime(x.effectiveFrom)}</td><td className="whitespace-nowrap">{fmtDateTime(x.effectiveTo)}</td><td><Badge tone={x.status === 'CONFIRMED' && !x.effectiveTo ? 'green' : undefined}>{x.status === 'CONFIRMED' && !x.effectiveTo ? 'CURRENT' : x.status}</Badge></td></tr>)}
      </Table>
      <h2 className="mb-2 mt-6 font-semibold">Rank history</h2>
      <Table head={['Rank', 'Effective from', 'Authority']}>
        {p.rankHistory.map((r: any) => <tr key={r.id}><td className="font-medium">{r.rank.name}</td><td>{fmtDate(r.effectiveFrom)}</td><td>{r.authorityRef ?? '—'}</td></tr>)}
      </Table>
      {canPost && (
        <Card className="mt-6 p-5"><h2 className="mb-1 font-semibold">Initiate posting change</h2>
          {pending ? <p className="text-sm text-slate-600">A posting to <b>{pending.toOrgUnit.name}</b> is already in progress (<Link className="text-brand hover:underline" href="/prisons/postings">view</Link>).</p> : (
            <form action={proposePosting} className="mt-3 grid gap-4 md:grid-cols-2"><input type="hidden" name="personnelId" value={p.id} />
              <Label text="Destination unit"><select name="toOrgUnitId" required className={inputCls}>{units.filter((u) => u.id !== p.currentOrgUnitId).map((u) => <option key={u.id} value={u.id}>{u.name} — {u.type.name}</option>)}</select></Label>
              <Label text="Reason"><input name="reason" required minLength={5} maxLength={500} className={inputCls} /></Label>
              <div className="md:col-span-2"><Button>Propose posting</Button><span className="ml-3 text-xs text-slate-500">Requires approval by an authorized supervisor, then confirmation by the receiving command. Rank and appointment are not changed.</span></div>
            </form>
          )}
        </Card>
      )}
    </>
  );
}
