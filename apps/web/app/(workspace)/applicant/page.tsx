import Link from 'next/link';
import { api, fmtDateTime } from '@/lib/api';
import { Badge, Button, Card, Flash, Label, PageHeader, Table, inputCls } from '@/components/ui';
import { apply } from './actions';
import { applicantStatus, applicantTone } from '@/lib/status';


export default async function Applicant({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const rows = await api<any[]>('/applicant/background-checks');
  return (
    <>
      <PageHeader title="My background-check applications" subtitle="Public applicant area — you see only your own applications, never internal police records" />
      <Flash sp={sp} />
      <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Demonstration only. To obtain a real police clearance certificate, use the Ghana Police Service&apos;s official online service. Do not enter real personal information here.</p>
      <Table head={['Reference', 'Name', 'Purpose', 'Submitted', 'Status']} empty={!rows.length}>
        {rows.map((a) => <tr key={a.id}><td><Link prefetch={false} className="font-medium text-slate-900 underline" href={`/applicant/${a.id}`}>{a.reference}</Link></td><td>{a.fullName}</td><td>{a.purpose}</td><td className="whitespace-nowrap">{fmtDateTime(a.submittedAt)}</td><td><Badge tone={applicantTone(a.status)}>{applicantStatus(a.status)}</Badge></td></tr>)}
      </Table>
      <Card className="mt-6 p-5"><h2 className="mb-3 font-semibold">New application</h2>
        <form action={apply} className="grid gap-4 md:grid-cols-2">
          <Label text="Full name (as on your identity document)"><input name="fullName" required minLength={3} maxLength={160} className={inputCls} /></Label>
          <Label text="Date of birth"><input type="date" name="dateOfBirth" required className={inputCls} /></Label>
          <Label text="Identity document"><select name="identifierType" className={inputCls}><option value="GHANA_CARD">Ghana Card</option><option value="PASSPORT">Passport</option></select></Label>
          <Label text="Document number" hint="Enter a made-up value such as DEMO-GHA-123456789-0."><input name="identifierValue" required minLength={4} maxLength={40} className={inputCls} /></Label>
          <Label text="Purpose"><input name="purpose" required minLength={3} maxLength={120} placeholder="e.g. Employment" className={inputCls} /></Label>
          <div className="md:col-span-2"><Button>Submit application</Button></div>
        </form>
      </Card>
    </>
  );
}
