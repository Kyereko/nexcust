import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { Certificate } from '@/components/certificate';
import { advanceBgCheck, decideBgCheck } from '../../actions';
import { bgTone } from '@/lib/status';

const NEXT: Record<string, [string, string]> = {
  SUBMITTED: ['VALIDATED', 'Confirm the application is complete and the purpose is stated'],
  VALIDATED: ['IDENTITY_VERIFIED', 'Verify identity (in the live service: biometric capture at the appointment) and match the applicant to an index record'],
  IDENTITY_VERIFIED: ['RECORDS_SEARCHED', 'Run the records search. Only court-recorded convictions are disclosed on a clearance'],
  RECORDS_SEARCHED: ['UNDER_REVIEW', 'Record your review and recommendation for the approving officer'],
};

export default async function BgDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!; const can = (p: string) => user.permissions.includes(p as never);
  const a = await api<any>(`/police/background-checks/${id}`);
  const next = NEXT[a.status]; const search = a.reviews.find((r: any) => r.stage === 'RECORDS_SEARCHED')?.findings;
  const iProcessed = a.reviews.some((r: any) => r.reviewerId === user.id);
  return (
    <>
      <Link href="/police/background-checks" className="text-sm text-brand hover:underline">← Background checks</Link>
      <PageHeader title={`Application ${a.reference}`} subtitle={`${a.fullName} · ${a.purpose}`}><Badge tone={bgTone(a.status)}>{a.status}</Badge></PageHeader>
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Application (as submitted)</h2><dl className="grid grid-cols-2 gap-4">
          <Field label="Full name">{a.fullName}</Field><Field label="Date of birth">{fmtDate(a.dateOfBirth)}</Field>
          <Field label="Identity document">{a.identifierType.replace(/_/g, ' ')}: {a.identifierValue}</Field><Field label="Submitted">{fmtDateTime(a.submittedAt)}</Field>
          <Field label="Matched index record">{a.person ? <>{a.person.surname}, {a.person.otherNames} <span className="text-slate-500">({a.person.indexNumber})</span></> : '—'}</Field>
        </dl></Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Records search result</h2>
          {!search ? <p className="text-sm text-slate-500">Not yet searched.</p> : !search.personLinked ? <p className="text-sm">No matching index record — nothing to disclose.</p> :
            search.convictions.length === 0 ? <p className="text-sm">No court-recorded conviction found.</p> : (
              <ul className="space-y-1 text-sm">{search.convictions.map((c: any, i: number) => <li key={i}>{fmtDate(c.convictedAt)} · {c.offence} · {c.court}{c.sentenceSummary ? ` · ${c.sentenceSummary}` : ''}</li>)}</ul>)}
          {search && <p className="mt-3 text-xs text-slate-500">Scope: {search.scope}. Searched {fmtDateTime(search.searchedAt)}.</p>}
        </Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Processing history</h2>
        <ol className="space-y-2 text-sm">
          <li className="flex gap-4"><span className="w-44 shrink-0 text-slate-500">{fmtDateTime(a.submittedAt)}</span><span className="font-medium">SUBMITTED</span><span className="text-slate-600">by the applicant</span></li>
          {a.reviews.map((r: any) => <li key={r.id} className="flex gap-4"><span className="w-44 shrink-0 text-slate-500">{fmtDateTime(r.createdAt)}</span><span className="font-medium">{r.stage.replace(/_/g, ' ')}</span><span className="text-slate-600">{r.note} — {r.reviewerName ?? 'officer'}</span></li>)}
        </ol>
      </Card>
      {next && can('police.bgcheck.review') && (
        <Card className="mt-4 p-5"><h2 className="mb-1 font-semibold">Next step: {next[0].replace(/_/g, ' ').toLowerCase()}</h2><p className="mb-3 text-sm text-slate-600">{next[1]}.</p>
          <form action={advanceBgCheck} className="space-y-3"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="stage" value={next[0]} />
            {next[0] === 'IDENTITY_VERIFIED' && (
              <Label text="Matching National Person Index record" hint="Candidates share the identity document number, or the surname and date of birth. Choose only a record you have confirmed is the applicant.">
                <select name="personId" className={inputCls}><option value="">No matching record in the index</option>{a.candidates.map((c: any) => <option key={c.id} value={c.id}>{c.indexNumber} — {c.surname}, {c.otherNames} — born {fmtDate(c.dateOfBirth)}{c.identifiers.some((i: any) => i.value === a.identifierValue) ? ' — document number matches' : ''}</option>)}</select>
              </Label>
            )}
            <Label text="Note"><input name="note" required minLength={3} maxLength={1000} className={inputCls} /></Label>
            <Button>Record step</Button>
          </form>
        </Card>
      )}
      {a.status === 'UNDER_REVIEW' && can('police.bgcheck.approve') && (
        <Card className="mt-4 p-5"><h2 className="mb-1 font-semibold">Decision</h2>
          {iProcessed ? <p className="text-sm text-slate-600">You processed this application, so a different authorized officer must decide it.</p> : (
            <form action={decideBgCheck} className="space-y-3"><input type="hidden" name="id" value={a.id} />
              <Label text="Result to print on the certificate, or reason for rejection" hint="This is your decision as the approving officer. The system does not determine the result."><textarea name="note" required minLength={5} maxLength={500} rows={2} className={inputCls} defaultValue={search && search.personLinked && search.convictions.length ? '' : 'No conviction recorded.'} /></Label>
              <div className="flex gap-2"><button name="decision" value="APPROVE" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">Approve and issue certificate</button>
                <button name="decision" value="REJECT" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Reject</button></div>
            </form>
          )}
        </Card>
      )}
      {a.certificate && <div className="mt-6"><Certificate c={a.certificate} holder={a.fullName} dob={a.dateOfBirth} purpose={a.purpose} /></div>}
    </>
  );
}
