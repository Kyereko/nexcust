import Link from 'next/link';
import { api, fmtDate, fmtDateTime, getSession } from '@/lib/api';
import { Badge, Button, Card, Field, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { assignHousing, enroll, initiateRelease, initiateTransfer } from '../../actions';

const RELEASE_TYPES = [['BAIL', 'Bail'], ['SENTENCE_SERVED', 'Sentence served'], ['COURT_ORDER', 'Court order'], ['ACQUITTAL', 'Acquittal'], ['PARDON_OR_AMNESTY', 'Pardon or amnesty'], ['FINE_PAID', 'Fine paid'], ['OTHER', 'Other']];

export default async function PrisonerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const user = (await getSession())!; const can = (p: string) => user.permissions.includes(p as never);
  const e = await api<any>(`/prisons/prisoners/${id}`);
  const p = e.prisonerRecord; const o = e.admission.courtOrder; const held = e.status === 'IN_CUSTODY';
  const pendingTransfer = e.transfers.find((t: any) => ['INITIATED', 'APPROVED', 'IN_TRANSIT'].includes(t.status));
  const pendingRelease = e.release && ['INITIATED', 'APPROVED'].includes(e.release.status) ? e.release : null;
  const establishments = held && can('prisons.transfer.initiate') ? await api<any[]>('/prisons/establishments') : [];
  return (
    <>
      <Link href="/prisons/prisoners" className="text-sm text-green-800 hover:underline">← Prisoner registry</Link>
      <PageHeader title={`${p.person.surname}, ${p.person.otherNames}`} subtitle={`${p.prisonerNumber} · ${e.facility.name}`}><span className="flex gap-2"><Badge>{e.classification}</Badge><Badge>{e.status}</Badge></span></PageHeader>
      <Flash sp={sp} />
      {(pendingTransfer || pendingRelease) && <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        {pendingTransfer && <>Transfer {pendingTransfer.reference} to {pendingTransfer.toFacility.name} is <b>{pendingTransfer.status.replace(/_/g, ' ').toLowerCase()}</b>. </>}
        {pendingRelease && <>Release {pendingRelease.reference} is awaiting authorization. </>}
        <Link className="underline" href="/prisons/transfers">Open transfers & releases</Link></p>}
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
      <Card className="mt-4 p-5"><h2 className="mb-3 font-semibold">Custody history</h2>
        <ul className="space-y-1 text-sm">
          <li>{fmtDateTime(e.admission.admittedAt)} · Admitted to {e.admission.facility.name} on {o.type.replace(/_/g, ' ').toLowerCase()} {o.orderRef}</li>
          {e.transfers.map((t: any) => <li key={t.id}>{fmtDateTime(t.receivedAt ?? t.dispatchedAt ?? t.createdAt)} · Transfer {t.reference}: {t.fromFacility.name} → {t.toFacility.name} <Badge>{t.status}</Badge></li>)}
          {e.release && <li>{fmtDateTime(e.release.releasedAt ?? e.release.createdAt)} · Release {e.release.reference}: {e.release.type.replace(/_/g, ' ')} — {e.release.legalAuthority} <Badge>{e.release.status}</Badge></li>}
          {p.enrollments.map((en: any) => <li key={en.id}>{fmtDateTime(en.enrolledAt)} · Programme: {en.programme.name} <Badge>{en.status}</Badge></li>)}
        </ul>
      </Card>
      {held && !pendingTransfer && !pendingRelease && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {can('prisons.transfer.initiate') && (
            <Card className="p-5"><h2 className="mb-3 font-semibold">Initiate transfer</h2>
              <form action={initiateTransfer} className="space-y-3"><input type="hidden" name="episodeId" value={e.id} />
                <Label text="Receiving establishment"><select name="toFacilityId" required className={inputCls}>{establishments.filter((f) => f.id !== e.facility.id).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Label>
                <Label text="Reason"><input name="reason" required minLength={5} maxLength={500} className={inputCls} /></Label>
                <Button tone="secondary">Initiate transfer</Button>
              </form>
            </Card>
          )}
          {can('prisons.release.initiate') && (
            <Card className="p-5"><h2 className="mb-3 font-semibold">Initiate release</h2>
              <form action={initiateRelease} className="space-y-3"><input type="hidden" name="episodeId" value={e.id} />
                <Label text="Release type"><select name="type" className={inputCls}>{RELEASE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Label>
                <Label text="Legal authority" hint="E.g. the court order or warrant authorizing release. A second officer must authorize."><textarea name="legalAuthority" required minLength={5} maxLength={500} rows={2} className={inputCls} /></Label>
                <Button tone="secondary">Initiate release</Button>
              </form>
            </Card>
          )}
          {can('prisons.prisoner.write') && (
            <Card className="p-5"><h2 className="mb-3 font-semibold">Housing</h2>
              <form action={assignHousing} className="flex items-end gap-2"><input type="hidden" name="episodeId" value={e.id} />
                <label className="flex-1 text-sm font-medium text-slate-700">Housing unit<select name="housingUnitId" defaultValue={e.housingUnitId ?? ''} required className={inputCls}>{e.facility.housingUnits.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
                <Button tone="secondary">Assign</Button>
              </form>
            </Card>
          )}
          {can('prisons.rehab.write') && e.facility.rehabProgrammes.length > 0 && (
            <Card className="p-5"><h2 className="mb-3 font-semibold">Rehabilitation</h2>
              <form action={enroll} className="flex items-end gap-2"><input type="hidden" name="episodeId" value={e.id} />
                <label className="flex-1 text-sm font-medium text-slate-700">Programme<select name="programmeId" required className={inputCls}>{e.facility.rehabProgrammes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
                <Button tone="secondary">Enroll</Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
