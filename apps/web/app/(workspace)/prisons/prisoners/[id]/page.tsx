import Link from 'next/link';
import { api, fmtDate, fmtDateTime } from '@/lib/api';
import { Badge, Card, Field, PageHeader } from '@/components/ui';

export default async function PrisonerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await api<any>(`/prisons/prisoners/${id}`);
  const p = e.prisonerRecord; const o = e.admission.courtOrder;
  return (
    <>
      <Link href="/prisons/prisoners" className="text-sm text-green-800 hover:underline">← Prisoner registry</Link>
      <PageHeader title={`${p.person.surname}, ${p.person.otherNames}`} subtitle={`${p.prisonerNumber} · ${e.facility.name}`}><span className="flex gap-2"><Badge>{e.classification}</Badge><Badge>{e.status}</Badge></span></PageHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-semibold">Admission & legal authority</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Admission ref.">{e.admission.reference}</Field><Field label="Admitted">{fmtDateTime(e.admission.admittedAt)}</Field>
            <Field label="Authority">{o.type.replace(/_/g, ' ')}</Field><Field label="Warrant ref.">{o.orderRef}</Field>
            <Field label="Court">{o.court}</Field><Field label="Issued">{fmtDate(o.issuedAt)}</Field>
            <Field label="Return date">{fmtDate(o.returnDate)}</Field><Field label="Housing">{e.housingUnit?.name ?? '—'}</Field>
          </dl>
        </Card>
        <Card className="p-5"><h2 className="mb-3 font-semibold">Sentence records</h2>
          {p.sentences.length ? p.sentences.map((s: any) => (
            <dl key={s.id} className="grid grid-cols-2 gap-4"><Field label="Offence">{s.offence}</Field><Field label="Sentence">{s.sentenceText}</Field><Field label="Sentenced">{fmtDate(s.sentencedAt)}</Field><Field label="Latest release date (as entered)">{fmtDate(s.latestReleaseDate)}</Field></dl>
          )) : <p className="text-sm text-slate-500">No sentence recorded — held on remand.</p>}
          <p className="mt-4 text-xs text-slate-500">Dates are entered from the warrant by authorized staff. The system does not compute release eligibility.</p>
        </Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Transfers, release and programmes</h2>
        <ul className="space-y-1 text-sm">
          {e.transfers.map((t: any) => <li key={t.id}>{fmtDateTime(t.receivedAt ?? t.createdAt)} · Transfer {t.reference}: {t.fromFacility.name} → {t.toFacility.name} <Badge>{t.status}</Badge></li>)}
          {e.release && <li>{fmtDateTime(e.release.releasedAt)} · Release {e.release.reference}: {e.release.type.replace(/_/g, ' ')} — {e.release.legalAuthority} <Badge>{e.release.status}</Badge></li>}
          {p.enrollments.map((en: any) => <li key={en.id}>Programme: {en.programme.name} <Badge>{en.status}</Badge></li>)}
          {!e.transfers.length && !e.release && !p.enrollments.length && <li className="text-slate-500">No transfers, releases or programme enrollments recorded.</li>}
        </ul>
      </Card>
    </>
  );
}
