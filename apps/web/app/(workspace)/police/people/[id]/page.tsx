import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Card, Field, Flash, LinkButton, PageHeader, Table } from '@/components/ui';
import { ExchangePanel } from '@/components/exchange-panel';

export default async function PersonRecord({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!;
  const r = await api<any>(`/police/persons/${id}/record`); const p = r.person;
  return (
    <>
      <Link href="/police/people" className="text-sm text-brand hover:underline">← People & records</Link>
      <PageHeader title={`${p.surname}, ${p.otherNames}`} subtitle={`Person index ${p.indexNumber} · police record`}>
        {user.permissions.includes('police.custody.write') && <LinkButton href={`/police/custody/new?personId=${p.id}`}>Register arrest</LinkButton>}
      </PageHeader>
      <Flash sp={sp} />
      <Card className="p-5"><dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field label="Sex">{p.sex}</Field><Field label="Date of birth">{fmtDate(p.dateOfBirth)}</Field><Field label="Hometown">{p.hometown ?? '—'}</Field>
        <Field label="Identifiers">{p.identifiers.length ? p.identifiers.map((i: any) => <div key={i.value}>{i.type.replace(/_/g, ' ')}: {i.value}{i.verified ? ' ✓' : ' (unverified)'}</div>) : 'None recorded'}</Field>
      </dl></Card>
      {user.permissions.includes('exchange.request') && <div className="mt-4"><ExchangePanel personId={p.id} provider="PRISONS" returnTo={`/police/people/${p.id}`} exchangeId={sp.exchange}
        defaultPurpose="Establish whether the person is held in prison custody" defaultBasis="Active police matter" /></div>}
      <h2 className="mb-2 mt-6 font-semibold">Convictions recorded from court documents</h2>
      <Table head={['Convicted', 'Offence', 'Court', 'Court ref.', 'Sentence']}>
        {r.convictions.map((c: any) => <tr key={c.id}><td className="whitespace-nowrap">{fmtDate(c.convictedAt)}</td><td>{c.offence}</td><td>{c.court}</td><td>{c.courtCaseRef ?? '—'}</td><td>{c.sentenceSummary ?? '—'}</td></tr>)}
      </Table>
      {!r.convictions.length && <p className="mt-2 text-sm text-slate-600">No conviction is recorded for this person.</p>}
      <h2 className="mb-2 mt-6 font-semibold">Arrests and charges <span className="text-sm font-normal text-slate-500">— not findings of guilt</span></h2>
      <Table head={['Arrest ref.', 'Arrested', 'Suspected offence', 'Station', 'Case', 'Charges']}>
        {r.arrests.map((a: any) => <tr key={a.id}><td className="font-medium">{a.reference}</td><td className="whitespace-nowrap">{fmtDateTime(a.arrestedAt)}</td><td>{a.suspectedOffence}</td><td>{a.facility.name}</td>
          <td>{a.case ? <Link prefetch={false} className="text-brand hover:underline" href={`/police/cases/${a.case.id}`}>{a.case.caseNumber}</Link> : '—'}</td>
          <td>{a.charges.length ? a.charges.map((c: any) => <span key={c.id} className="mr-2">{c.offence} <Badge>{c.status}</Badge></span>) : '—'}</td></tr>)}
      </Table>
      {!r.arrests.length && <p className="mt-2 text-sm text-slate-600">No arrest is recorded within your command.</p>}
      {r.recordsHeldByOtherCommands > 0 && <p className="mt-2 text-sm text-amber-800">{r.recordsHeldByOtherCommands} arrest record{r.recordsHeldByOtherCommands === 1 ? ' is' : 's are'} held by other commands and not shown at your access level.</p>}
      <h2 className="mb-2 mt-6 font-semibold">Custody episodes</h2>
      <Table head={['Reference', 'Station', 'Detained', 'Closed', 'Status']}>
        {r.custody.map((c: any) => <tr key={c.id}><td><Link prefetch={false} className="font-medium text-brand hover:underline" href={`/police/custody/${c.id}`}>{c.reference}</Link></td><td>{c.facility.name}</td><td className="whitespace-nowrap">{fmtDateTime(c.detainedAt)}</td><td className="whitespace-nowrap">{fmtDateTime(c.closedAt)}</td><td><Badge>{c.status}</Badge></td></tr>)}
      </Table>
    </>
  );
}
