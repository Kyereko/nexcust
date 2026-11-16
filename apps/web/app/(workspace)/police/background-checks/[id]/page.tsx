import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { Certificate } from '@/components/certificate';
import { advanceBgCheck, decideBgCheck, dispatchBgCheck, requestBgInfo } from '../../actions';
import { BG_LABEL, IDENT_LABEL, bgTone } from '@/lib/status';

const GUIDE: Record<string, string> = {
  PAYMENT_CONFIRMED: 'Confirm the Ghana.gov payment (card or mobile money). Fees are non-refundable.',
  APPOINTMENT_BOOKED: 'Book the fingerprint appointment at a capture centre (regional commands; Nima Police Station in Accra).',
  BIOMETRICS_CAPTURED: 'Record attendance: identity checked against the Ghana Card and live-scan fingerprints taken. Match the applicant to an index record only if you have confirmed it.',
  RECORDS_SEARCHED: 'Record the criminal-records search result. An "Ident" result goes to investigation.',
  UNDER_INVESTIGATION: 'Record the outcome of the investigation, then send for signature.',
  UNDER_REVIEW: 'Send to an authorised signatory for decision.',
};

export default async function BgDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!; const can = (p: string) => user.permissions.includes(p as never);
  const a = await api<any>(`/police/background-checks/${id}`);
  const stage = a.status === 'ADDITIONAL_INFO_REQUESTED' ? 'RESUME' : a.nextStage;
  const iProcessed = a.reviews.some((r: any) => r.reviewerId === user.id);
  const investigated = a.criminalIdent === 'IDENT' || a.reviews.some((r: any) => r.stage === 'UNDER_INVESTIGATION');
  const fees = a.serviceType ? `GH₵${a.serviceType.vettingFeeGhs.toLocaleString()} + GH₵${a.serviceType.addOnFeeGhs} photo & delivery` : '—';
  return (
    <>
      <Link href="/police/background-checks" className="text-sm text-brand hover:underline">← Police clearance</Link>
      <PageHeader title={`Application ${a.reference}`} subtitle={`${a.fullName} · ${a.serviceType?.name ?? a.purpose}`}><Badge tone={bgTone(a.status)}>{BG_LABEL[a.status] ?? a.status}</Badge></PageHeader>
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Application</h2><dl className="grid grid-cols-2 gap-4">
          <Field label="Full name">{a.fullName}</Field><Field label="Date of birth">{fmtDate(a.dateOfBirth)}</Field>
          <Field label="Identity document">{a.identifierType.replace(/_/g, ' ')}: {a.identifierValue}</Field><Field label="Purpose">{a.purpose}</Field>
          <Field label="Service">{a.serviceType?.name ?? '—'}</Field><Field label="Fees (published)">{fees}</Field>
          <Field label="Payment reference">{a.paymentRef ?? '—'}</Field><Field label="Residence rule">{a.residenceAttested ? 'Attested by applicant' : '—'}</Field>
          <Field label="Fingerprint appointment">{a.biometricCaptureMode === 'NOT_TAKEN_NOMINAL' ? 'Not required — Nominal Vetting (CID Form 196)' : a.appointmentAt ? `${fmtDateTime(a.appointmentAt)} · ${a.captureCentre}` : '—'}</Field>
          <Field label="Attended">{fmtDateTime(a.attendedAt)}</Field>
          <Field label="Matched index record">{a.person ? <>{a.person.surname}, {a.person.otherNames} <span className="text-slate-500">({a.person.indexNumber})</span></> : '—'}</Field>
          <Field label="Delivery">{a.deliveryPostOffice ? `Ghana Post — ${a.deliveryPostOffice}` : '—'}{a.parcelBatchNo ? ` · batch ${a.parcelBatchNo}` : ''}</Field>
        </dl></Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Criminal records search</h2>
          <p className="text-sm">Result: <b>{a.criminalIdent ? IDENT_LABEL[a.criminalIdent] : 'Not yet searched'}</b></p>
          {a.convictions.length > 0 && <div className="mt-3"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Supporting evidence — court-recorded convictions in NEXCUST</div>
            <ul className="mt-1 space-y-1 text-sm">{a.convictions.map((c: any, i: number) => <li key={i}>{fmtDate(c.convictedAt)} · {c.offence} · {c.court}{c.sentenceSummary ? ` · ${c.sentenceSummary}` : ''}</li>)}</ul></div>}
          <p className="mt-3 text-xs text-slate-500">The search result is recorded by the records officer (in live practice, CDSB). Only convictions are disclosed on a clearance; arrests and charges are never disclosed.</p>
        </Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Processing history</h2>
        <ol className="space-y-2 text-sm">
          <li className="flex gap-4"><span className="w-44 shrink-0 text-slate-500">{fmtDateTime(a.submittedAt)}</span><span className="font-medium">Submitted</span><span className="text-slate-600">by the applicant</span></li>
          {a.reviews.map((r: any) => <li key={r.id} className="flex gap-4"><span className="w-44 shrink-0 text-slate-500">{fmtDateTime(r.createdAt)}</span><span className="font-medium">{BG_LABEL[r.stage] ?? r.stage}</span><span className="text-slate-600">{r.note} — {r.reviewerName ?? 'officer'}</span></li>)}
        </ol>
      </Card>
      {stage && can('police.bgcheck.review') && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 font-semibold">{stage === 'RESUME' ? 'Resume processing' : `Next: ${(BG_LABEL[stage] ?? stage).toLowerCase()}`}</h2>
          <p className="mb-3 text-sm text-slate-600">{stage === 'RESUME' ? 'Record that the requested information was received; processing returns to where it stopped.' : GUIDE[stage]}</p>
          <form action={advanceBgCheck} className="grid gap-3 md:grid-cols-2"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="stage" value={stage} />
            {stage === 'PAYMENT_CONFIRMED' && <Label text="Payment reference (Ghana.gov)"><input name="paymentRef" required maxLength={80} className={inputCls} /></Label>}
            {stage === 'APPOINTMENT_BOOKED' && a.serviceType?.requiresFingerprints !== false && <>
              <Label text="Appointment (GMT)"><input type="datetime-local" name="appointmentAt" required className={inputCls} /></Label>
              <Label text="Capture centre"><input name="captureCentre" required maxLength={120} placeholder="e.g. Nima Police Station, Accra" className={inputCls} /></Label></>}
            {stage === 'BIOMETRICS_CAPTURED' && (
              <div className="md:col-span-2"><Label text="Matching National Person Index record" hint="Candidates share the document number, or the surname and date of birth. Choose only a record you have confirmed.">
                <select name="personId" className={inputCls}><option value="">No matching record in the index</option>{a.candidates.map((c: any) => <option key={c.id} value={c.id}>{c.indexNumber} — {c.surname}, {c.otherNames} — born {fmtDate(c.dateOfBirth)}{c.identifiers.some((i: any) => i.value === a.identifierValue) ? ' — document number matches' : ''}</option>)}</select>
              </Label></div>
            )}
            {stage === 'RECORDS_SEARCHED' && <Label text="Criminal ident"><select name="criminalIdent" required className={inputCls}><option value="NOT_IDENT">Not ident</option><option value="NOT_RECORDED">Not recorded</option><option value="IDENT">Ident — record found</option></select></Label>}
            <div className="md:col-span-2"><Label text="Note"><input name="note" required minLength={3} maxLength={1000} className={inputCls} /></Label></div>
            <div className="md:col-span-2"><Button>Record step</Button></div>
          </form>
          {stage !== 'RESUME' && (
            <form action={requestBgInfo} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4"><input type="hidden" name="id" value={a.id} />
              <label className="flex-1 text-sm font-medium text-slate-700">Request additional information from the applicant<input name="infoNote" required minLength={5} maxLength={500} className={inputCls} /></label>
              <Button tone="secondary">Request information</Button></form>
          )}
        </Card>
      )}
      {a.status === 'UNDER_REVIEW' && can('police.bgcheck.approve') && (
        <Card className="mt-4 p-5"><h2 className="mb-1 font-semibold">Decision and signature</h2>
          {iProcessed ? <p className="text-sm text-slate-600">You processed this application, so a different authorised signatory must decide it.</p>
            : !a.viewerIsSignatory ? <p className="text-sm text-slate-600">Only an officer on the authorised signatory register can sign clearance certificates.</p> : (
            <div className="space-y-4">
              <form action={decideBgCheck} className="space-y-3"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="APPROVE" />
                {investigated
                  ? <Label text="Result wording (required — the system does not generate an adverse certificate)"><textarea name="note" required minLength={5} maxLength={500} rows={2} className={inputCls} /></Label>
                  : <p className="rounded-md bg-sage p-3 text-sm">Certificate wording: &ldquo;The applicant does not appear in the criminal records of the Ghana Police Service.&rdquo; Signed for: Director-General, CID.</p>}
                <Button>Approve and sign certificate</Button>
              </form>
              <form action={decideBgCheck} className="flex flex-wrap items-end gap-2 border-t border-line pt-4"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="REJECT" />
                <label className="flex-1 text-sm font-medium text-slate-700">Reason for rejection<input name="rejectReason" required minLength={5} maxLength={500} className={inputCls} /></label>
                <Button tone="secondary">Reject</Button>
              </form>
            </div>
          )}
        </Card>
      )}
      {a.status === 'CERTIFICATE_ISSUED' && can('police.bgcheck.review') && (
        <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Dispatch by Ghana Post</h2>
          <form action={dispatchBgCheck} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={a.id} />
            <label className="flex-1 text-sm font-medium text-slate-700">Post office<input name="deliveryPostOffice" required minLength={3} defaultValue={a.deliveryPostOffice ?? ''} className={inputCls} /></label>
            <label className="text-sm font-medium text-slate-700">Parcel batch no.<input name="parcelBatchNo" required minLength={3} className={inputCls} /></label>
            <Button>Record dispatch</Button></form>
        </Card>
      )}
      {a.certificate && <div className="mt-6"><Certificate c={a.certificate} holder={a.fullName} dob={a.dateOfBirth} purpose={a.purpose} /></div>}
    </>
  );
}
