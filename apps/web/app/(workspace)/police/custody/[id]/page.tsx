import Link from 'next/link';
import { api, fmtDate, fmtDateTime } from '@/lib/api';
import { Badge, Card, Field, PageHeader } from '@/components/ui';

export default async function CustodyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await api<any>(`/police/custody/${id}`);
  return (
    <>
      <Link href="/police/custody" className="text-sm text-blue-700 hover:underline">← Custody register</Link>
      <PageHeader title={`Custody episode ${e.reference}`} subtitle={e.facility.name}><Badge>{e.status}</Badge></PageHeader>
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
            <Field label="Linked case">{e.arrest.case?.caseNumber ?? '—'}</Field><Field label="Closed at">{fmtDateTime(e.closedAt)}</Field>
          </dl>
          <p className="mt-4 text-xs text-slate-500">An arrest or detention record is not a finding of guilt.</p>
        </Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Movement history (immutable)</h2>
        <ol className="space-y-2 text-sm">{e.movements.map((m: any) => <li key={m.id} className="flex gap-4"><span className="w-44 shrink-0 text-slate-500">{fmtDateTime(m.occurredAt)}</span><span className="font-medium">{m.type.replace(/_/g, ' ')}</span><span className="text-slate-600">{m.note}</span></li>)}</ol>
      </Card>
    </>
  );
}
