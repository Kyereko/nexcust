import Link from 'next/link';
import { api, fmtDate, fmtDateTime } from '@/lib/api';
import { Badge, Card, Field, Flash, PageHeader } from '@/components/ui';
import { Certificate } from '@/components/certificate';
import { applicantStatus, applicantTone } from '@/lib/status';

const STEPS = ['SUBMITTED', 'VALIDATED', 'IDENTITY_VERIFIED', 'RECORDS_SEARCHED', 'UNDER_REVIEW', 'CERTIFICATE_ISSUED'];
const STEP_LABEL: Record<string, string> = { SUBMITTED: 'Submitted', VALIDATED: 'Application checked', IDENTITY_VERIFIED: 'Identity verified', RECORDS_SEARCHED: 'Records searched', UNDER_REVIEW: 'Awaiting decision', CERTIFICATE_ISSUED: 'Certificate issued' };

export default async function MyApplication({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const a = await api<any>(`/applicant/background-checks/${id}`);
  const at = STEPS.indexOf(a.status);
  return (
    <>
      <Link href="/applicant" className="text-sm underline">← My applications</Link>
      <PageHeader title={`Application ${a.reference}`} subtitle={a.purpose}><Badge tone={applicantTone(a.status)}>{applicantStatus(a.status)}</Badge></PageHeader>
      <Flash sp={sp} />
      <Card className="p-5"><dl className="grid grid-cols-2 gap-4 md:grid-cols-4"><Field label="Name">{a.fullName}</Field><Field label="Date of birth">{fmtDate(a.dateOfBirth)}</Field><Field label="Submitted">{fmtDateTime(a.submittedAt)}</Field><Field label="Last update">{fmtDateTime(a.updatedAt)}</Field></dl></Card>
      {a.status === 'REJECTED' ? <Card className="mt-4 p-5 text-sm">A certificate was not issued for this application. In the live service you would be contacted with next steps.</Card> : (
        <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Progress</h2>
          <ol className="grid gap-2 sm:grid-cols-6">{STEPS.map((s, i) => <li key={s} className={`rounded-md border px-3 py-2 text-xs ${i <= at ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-500'}`}>{i <= at ? '✓ ' : ''}{STEP_LABEL[s]}</li>)}</ol>
        </Card>
      )}
      {a.certificate && <div className="mt-6"><Certificate c={a.certificate} holder={a.fullName} dob={a.dateOfBirth} purpose={a.purpose} /></div>}
    </>
  );
}
