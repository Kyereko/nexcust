import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { addMovement, addProperty, closeCustody, juvenileNotice, propertyOutcome, recordSearch, reviewCustody } from '../../actions';

const BASIS: Record<string, string> = { WARRANT: 'Under warrant', WITHOUT_WARRANT_S10: 'Without warrant (Act 30 s.10)', PRIVATE_PERSON_S12: 'By a private person (s.12)' };

export default async function CustodyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!;
  const e = await api<any>(`/police/custody/${id}`);
  const open = e.status === 'IN_CUSTODY'; const can = (p: string) => user.permissions.includes(p as never);
  const overdue = open && e.courtDeadlineAt && new Date(e.courtDeadlineAt).getTime() < Date.now();
  return (
    <>
      <Link href="/police/custody" className="text-sm text-brand hover:underline">← Custody register</Link>
      <PageHeader title={`Custody episode ${e.reference}`} subtitle={e.facility.name}><Badge>{e.status}</Badge></PageHeader>
      <Flash sp={sp} />
      {e.isJuvenile && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Juvenile (under 18 at arrest).</b> Keep apart from adults. Detention order due by {fmtDateTime(e.juvenileDetentionOrderDueAt)}. Parent/guardian notified: {e.parentGuardianNotifiedAt ? fmtDateTime(e.parentGuardianNotifiedAt) : <b>not yet recorded</b>}.
          {!e.parentGuardianNotifiedAt && open && can('police.custody.write') && (
            <form action={juvenileNotice} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={e.id} />
              <label className="text-xs font-medium">Notified at (GMT)<input type="datetime-local" name="notifiedAt" required defaultValue={new Date().toISOString().slice(0, 16)} className={inputCls} /></label>
              <Button tone="secondary">Record notification</Button></form>
          )}
        </div>
      )}
      {overdue && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Held beyond the configured court deadline ({fmtDateTime(e.courtDeadlineAt)}). Refer to the authorizing officer.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Person (identity record)</h2>
          {e.person.identityProtected && <p className="mb-3 rounded-md bg-sage px-3 py-2 text-xs text-brand">Identity protected: this person was a juvenile at arrest (Juvenile Justice Act, 2003 s.3). Only the handling station&apos;s records officer and commander see identifying details.</p>}
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
            <Field label="Basis of arrest">{BASIS[e.arrest.arrestBasis] ?? '—'}{e.arrest.warrantRef ? ` · ${e.arrest.warrantRef}` : ''}</Field>
            <Field label="Rights explained">{e.arrest.reasonsGivenAt ? <>Reasons {fmtDateTime(e.arrest.reasonsGivenAt)}; lawyer {fmtDateTime(e.arrest.rightToLawyerGivenAt)}; in {e.arrest.languageUsed}{e.arrest.lawyerRequested ? ' · lawyer requested' : ''}</> : '—'}</Field>
            <Field label="Supervisor review">{e.reviewedAt ? fmtDateTime(e.reviewedAt) : 'Not yet reviewed'}</Field><Field label="Closed at">{fmtDateTime(e.closedAt)}</Field>
            {e.dispositionNote && <Field label="Disposition">{e.dispositionNote}</Field>}
            {e.bailBond && <Field label="Bail bond (Act 30 s.15(2))">GH₵{e.bailBond.amountGhs.toLocaleString()}{e.bailBond.depositInLieuGhs ? ` (cash deposit GH₵${e.bailBond.depositInLieuGhs.toLocaleString()})` : ''} · report to {e.bailBond.reportTo === 'COURT' ? 'court' : 'police station'} — {e.bailBond.reportPlace}, {fmtDateTime(e.bailBond.reportAt)} · sureties: {(e.bailBond.sureties as any[]).map((x) => x.name).join(', ') || 'none'}</Field>}
          </dl>
          <p className="mt-4 text-xs text-slate-500">An arrest or detention record is not a finding of guilt.</p>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Search on arrest (Act 30 s.8)</h2>
          {e.searchedAt ? <dl className="grid grid-cols-2 gap-4"><Field label="Searched at">{fmtDateTime(e.searchedAt)}</Field><Field label="By">{e.searchingOfficer} ({e.searchingOfficerSex === 'FEMALE' ? 'female' : 'male'} officer)</Field>
              {e.searchOverrideReason && <Field label="Reason recorded">{e.searchOverrideReason}</Field>}</dl>
            : open && can('police.custody.write') ? (
              <form action={recordSearch} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={e.id} />
                <Label text="Searched at (GMT)"><input type="datetime-local" name="searchedAt" required defaultValue={new Date().toISOString().slice(0, 16)} className={inputCls} /></Label>
                <Label text="Searching officer"><input name="searchingOfficer" required minLength={3} maxLength={120} placeholder="Rank and name" className={inputCls} /></Label>
                <Label text="Officer is"><select name="searchingOfficerSex" className={inputCls}><option value="FEMALE">Female</option><option value="MALE">Male</option></select></Label>
                <Label text="Reason (only if a woman was not searched by a woman)"><input name="overrideReason" maxLength={500} className={inputCls} /></Label>
                <div className="sm:col-span-2"><Button tone="secondary">Record search</Button></div></form>
            ) : <p className="text-sm text-slate-500">Not recorded.</p>}
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Property in safe custody</h2>
          {e.property.length ? <ul className="space-y-2 text-sm">{e.property.map((p: any) => (
            <li key={p.id} className="rounded-md border border-line bg-white p-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><span>{p.quantity} × {p.description}{p.sealedBagRef ? ` · bag ${p.sealedBagRef}` : ''}</span>
                {p.outcome ? <Badge tone="green">{p.outcome.replace(/_/g, ' ')}</Badge> : <Badge tone="amber">HELD</Badge>}</div>
              {p.outcome && <div className="text-xs text-slate-500">{fmtDateTime(p.outcomeAt)}{p.receivedBy ? ` · received by ${p.receivedBy}` : ''}</div>}
              {!p.outcome && can('police.custody.write') && (
                <form action={propertyOutcome} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={e.id} /><input type="hidden" name="itemId" value={p.id} />
                  <select name="outcome" aria-label="Outcome" className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"><option value="RETURNED">Returned</option><option value="RETAINED_AS_EXHIBIT">Retained as exhibit</option><option value="HANDED_OVER">Handed over</option></select>
                  <input name="receivedBy" aria-label="Received by" placeholder="Received by" className="flex-1 rounded-md border border-line bg-white px-2 py-1.5 text-xs" />
                  <Button tone="secondary">Record</Button></form>
              )}
            </li>))}</ul> : <p className="text-sm text-slate-500">No property recorded.</p>}
          {open && can('police.custody.write') && (
            <form action={addProperty} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={e.id} />
              <label className="flex-1 text-xs font-medium text-slate-700">Item<input name="description" required minLength={2} maxLength={300} className={inputCls} /></label>
              <label className="w-16 text-xs font-medium text-slate-700">Qty<input type="number" name="quantity" min={1} defaultValue={1} className={inputCls} /></label>
              <label className="w-28 text-xs font-medium text-slate-700">Sealed bag<input name="sealedBagRef" maxLength={60} className={inputCls} /></label>
              <Button tone="secondary">Add item</Button></form>
          )}
          <p className="mt-2 text-xs text-slate-500">Every item must be returned, retained as an exhibit or handed over before release.</p>
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
                <fieldset className="rounded-md border border-line p-3"><legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Police enquiry bail — bond (required for release on bail)</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Label text="Bond amount (GH₵)"><input type="number" name="bailAmount" min={0} className={inputCls} /></Label>
                    <Label text="Cash deposit in lieu (GH₵, optional)"><input type="number" name="bailDeposit" min={0} className={inputCls} /></Label>
                    <Label text="Report to"><select name="bailReportTo" className={inputCls}><option value="POLICE_STATION">Police station</option><option value="COURT">Court</option></select></Label>
                    <Label text="Place"><input name="bailReportPlace" maxLength={200} defaultValue={e.facility.name} className={inputCls} /></Label>
                    <Label text="Date and time to report (GMT)"><input type="datetime-local" name="bailReportAt" className={inputCls} /></Label>
                    <Label text="Surety name"><input name="suretyName" maxLength={120} className={inputCls} /></Label>
                    <Label text="Surety ID reference"><input name="suretyId" maxLength={60} className={inputCls} /></Label>
                    <Label text="Surety address"><input name="suretyAddress" maxLength={200} className={inputCls} /></Label>
                  </div>
                </fieldset>
                <Button>Authorize and close custody</Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
