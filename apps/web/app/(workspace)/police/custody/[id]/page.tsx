import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { addMovement, closeCustody, reviewCustody } from '../../actions';

export default async function CustodyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!;
  const e = await api<any>(`/police/custody/${id}`);
  const open = e.status === 'IN_CUSTODY'; const can = (p: string) => user.permissions.includes(p as never);
  const overdue = open && e.courtDeadlineAt && new Date(e.courtDeadlineAt).getTime() < Date.now();
  return (
    <>
      <Link href="/police/custody" className="text-sm text-blue-700 hover:underline">← Custody register</Link>
      <PageHeader title={`Custody episode ${e.reference}`} subtitle={e.facility.name}><Badge>{e.status}</Badge></PageHeader>
      <Flash sp={sp} />
      {overdue && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Held beyond the configured court deadline ({fmtDateTime(e.courtDeadlineAt)}). Refer to the authorizing officer.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Person (identity record)</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Name">{e.person.surname}, {e.person.otherNames}</Field><Field label="Person index no.">{e.person.indexNumber}</Field>
            <Field label="Sex">{e.person.sex}</Field><Field label="Date of birth">{fmtDate(e.person.dateOfBirth)}</Field>
            <Field label="Identifiers">{e.person.identifiers.length ? e.person.identifiers.map((i: any) => <div key={i.id}>{i.type.replace(/_/g, ' ')}: {i.value} {i.verified ? '✓' : '(unverified)'}</div>) : 'None recorded'}</Field>
          </dl>
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Arrest & detention</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Arrest reference">{e.arrest.reference}</Field><Field label="Suspected offence">{e.arrest.suspectedOffence}</Field>
            <Field label="Detained at">{fmtDateTime(e.detainedAt)}</Field><Field label="Court deadline">{fmtDateTime(e.courtDeadlineAt)}</Field>
            <Field label="Legal authority">{e.legalAuthority ?? '—'}</Field><Field label="Cell">{e.cellRef ?? '—'}</Field>
            <Field label="Supervisor review">{e.reviewedAt ? fmtDateTime(e.reviewedAt) : 'Not yet reviewed'}</Field><Field label="Closed at">{fmtDateTime(e.closedAt)}</Field>
            {e.dispositionNote && <Field label="Disposition">{e.dispositionNote}</Field>}
          </dl>
          <p className="mt-4 text-xs text-slate-500">An arrest or detention record is not a finding of guilt.</p>
        </Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Movement history (immutable)</h2>
        <ol className="space-y-2 text-sm">{e.movements.map((m: any) => <li key={m.id} className="flex gap-4"><span className="w-44 shrink-0 text-slate-500">{fmtDateTime(m.occurredAt)}</span><span className="font-medium">{m.type.replace(/_/g, ' ')}</span><span className="text-slate-600">{m.note}</span></li>)}</ol>
      </Card>
      {open && (can('police.custody.write') || can('police.custody.close')) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {can('police.custody.write') && (
            <Card className="p-5"><h2 className="mb-3 font-semibold">Record a movement</h2>
              <form action={addMovement} className="space-y-3"><input type="hidden" name="id" value={e.id} />
                <Label text="Type"><select name="type" className={inputCls}><option value="COURT_APPEARANCE">Court appearance</option><option value="MEDICAL">Medical</option><option value="RETURN">Return to cells</option><option value="CELL_ASSIGNMENT">Cell assignment</option></select></Label>
                <Label text="Note"><input name="note" required minLength={3} maxLength={500} className={inputCls} /></Label>
                <Button tone="secondary">Record movement</Button>
              </form>
            </Card>
          )}
          {can('police.custody.close') && (
            <Card className="p-5"><h2 className="mb-3 font-semibold">Supervisor review and disposition</h2>
              {!e.reviewedAt && <form action={reviewCustody} className="mb-4"><input type="hidden" name="id" value={e.id} /><Button tone="secondary">Mark record as reviewed</Button></form>}
              <form action={closeCustody} className="space-y-3"><input type="hidden" name="id" value={e.id} />
                <Label text="Disposition"><select name="disposition" className={inputCls}><option value="RELEASED_ON_BAIL">Released on bail</option><option value="TRANSFERRED_TO_COURT">Transferred to court</option><option value="REMANDED_TO_PRISON">Remanded to prison</option><option value="RELEASED_NO_CHARGE">Released without charge</option><option value="CLOSED_OTHER">Other</option></select></Label>
                <Label text="Authority and particulars" hint="You are recording your own decision as the authorizing officer. The officer who opened the episode cannot authorize its closure."><textarea name="dispositionNote" required minLength={5} maxLength={1000} rows={2} className={inputCls} /></Label>
                <Button>Authorize and close custody</Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
