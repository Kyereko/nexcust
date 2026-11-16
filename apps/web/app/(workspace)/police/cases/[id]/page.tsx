import Link from 'next/link';
import { api, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, PageHeader, inputCls } from '@/components/ui';
import { updateCase } from '../../actions';

const STATUSES = ['OPEN', 'UNDER_INVESTIGATION', 'FORWARDED_FOR_ADVICE', 'BEFORE_COURT', 'CLOSED'];

export default async function CaseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!;
  const c = await api<any>(`/police/cases/${id}`);
  return (
    <>
      <Link href="/police/cases" className="text-sm text-blue-700 hover:underline">← Cases & investigations</Link>
      <PageHeader title={c.caseNumber} subtitle={c.title}><Badge>{c.status}</Badge></PageHeader>
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Case</h2><dl className="grid grid-cols-2 gap-4">
          <Field label="Station">{c.facility.name}</Field><Field label="Offence category">{c.offenceCategory}</Field><Field label="Opened">{fmtDateTime(c.openedAt)}</Field><Field label="Closed">{fmtDateTime(c.closedAt)}</Field>
          <Field label="Incident">{c.incident ? `${c.incident.reference}: ${c.incident.summary}` : '—'}</Field></dl>
          {user.permissions.includes('police.case.write') && (
            <form action={updateCase} className="mt-4 flex items-end gap-2"><input type="hidden" name="id" value={c.id} />
              <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={c.status} className={inputCls}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></label>
              <Button tone="secondary">Update status</Button></form>
          )}
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">People linked to the case</h2>
          <ul className="space-y-1 text-sm">{c.persons.map((p: any) => <li key={p.id}><Badge tone="slate">{p.role}</Badge> <Link prefetch={false} className="text-blue-700 hover:underline" href={`/police/people/${p.person.id}`}>{p.person.surname}, {p.person.otherNames}</Link> <span className="text-slate-500">{p.person.indexNumber}</span></li>)}
            {!c.persons.length && <li className="text-slate-500">No persons linked yet.</li>}</ul>
          <h2 className="mb-2 mt-5 font-semibold">Arrests</h2>
          <ul className="space-y-1 text-sm">{c.arrests.map((a: any) => <li key={a.id}>{a.reference} · {fmtDateTime(a.arrestedAt)} · {a.suspectedOffence}</li>)}{!c.arrests.length && <li className="text-slate-500">None recorded.</li>}</ul>
          <h2 className="mb-2 mt-5 font-semibold">Charges</h2>
          <ul className="space-y-1 text-sm">{c.charges.map((ch: any) => <li key={ch.id}>{ch.offence} <Badge>{ch.status}</Badge></li>)}{!c.charges.length && <li className="text-slate-500">None filed.</li>}</ul>
        </Card>
      </div>
    </>
  );
}
