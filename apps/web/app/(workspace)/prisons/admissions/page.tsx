import Link from 'next/link';
import type { Paginated } from '@nexcust/contracts';
import { api, fmtDate, qs } from '@/lib/api';
import { Button, Card, Field, Flash, Label, LinkButton, PageHeader, SearchBar, Table, inputCls } from '@/components/ui';
import { admit } from '../actions';
import { getSession } from '@/lib/api';
import { ExchangePanel } from '@/components/exchange-panel';

export default async function Admissions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (!sp.personId) {
    const term = sp.q?.trim();
    const data = term && term.length >= 2 ? await api<Paginated<any>>(`/persons${qs({ q: term })}`) : null;
    return (
      <>
        <PageHeader title="Admissions & custody" subtitle="Step 1 — identify the person against the National Person Index">
          <LinkButton href="/prisons/people/new">Register new person</LinkButton>
        </PageHeader>
        <Flash sp={sp} />
        <SearchBar q={sp.q} placeholder="Name, index number or identifier" />
        {!data ? <Card className="p-8 text-sm text-slate-600">Search for the person named on the warrant. Create a new identity record only when no existing record matches.</Card> : (
          <Table head={['Index no.', 'Name', 'Sex', 'Date of birth', 'Identifiers', '']} empty={!data.items.length}>
            {data.items.map((p) => (
              <tr key={p.id}><td className="font-medium">{p.indexNumber}</td><td>{p.surname}, {p.otherNames}</td><td>{p.sex}</td><td>{fmtDate(p.dateOfBirth)}</td>
                <td className="text-xs">{p.identifiers.map((i: any) => `${i.type.replace(/_/g, ' ')}: ${i.value}`).join('; ') || '—'}</td>
                <td className="text-right"><Link prefetch={false} className="text-brand hover:underline" href={`/prisons/admissions?personId=${p.id}`}>Admit</Link></td></tr>
            ))}
          </Table>
        )}
      </>
    );
  }
  const [p, facilities] = await Promise.all([api<any>(`/persons/${sp.personId}`), api<any[]>('/prisons/facilities')]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Link href="/prisons/admissions" className="text-sm text-brand hover:underline">← Admissions</Link>
      <PageHeader title="Admit to custody" subtitle="Step 2 — verify the legal authority and record the admission" />
      <Flash sp={sp} />
      <Card className="mb-4 p-5"><dl className="grid grid-cols-2 gap-4 md:grid-cols-4"><Field label="Person">{p.surname}, {p.otherNames}</Field><Field label="Index no.">{p.indexNumber}</Field><Field label="Sex">{p.sex}</Field><Field label="Date of birth">{fmtDate(p.dateOfBirth)}</Field></dl></Card>
      {(await getSession())!.permissions.includes('exchange.request') && <div className="mb-4"><ExchangePanel personId={p.id} provider="POLICE" returnTo={`/prisons/admissions?personId=${p.id}`} exchangeId={sp.exchange}
        defaultPurpose="Verify police custody history before admission" defaultBasis="Warrant presented for admission" /></div>}
      <Card className="p-5">
        <form action={admit} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="personId" value={p.id} />
          <Label text="Establishment"><select name="facilityId" required className={inputCls}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.population}/{f.capacity ?? '—'})</option>)}</select></Label>
          <Label text="Housing unit"><select name="housingUnitId" className={inputCls}><option value="">Assign later</option>{facilities.flatMap((f) => f.housingUnits.map((h: any) => <option key={h.id} value={h.id}>{f.name} — {h.name}</option>))}</select></Label>
          <h2 className="font-semibold md:col-span-2">Legal authority (from the court document)</h2>
          <Label text="Warrant (Act 30 form)"><select name="warrantType" className={inputCls}><option value="REMAND_COMMITMENT_FOR_TRIAL">Form 14 — Commitment for trial / remand</option><option value="COMMITMENT_TO_UNDERGO_SENTENCE">Form 21 — Commitment to undergo sentence</option><option value="COMMITMENT_ON_DEFAULT_OF_PAYMENT">Form 24 — Commitment on default of payment</option></select></Label>
          <Label text="Issuing court"><input name="court" required minLength={3} maxLength={120} className={inputCls} /></Label>
          <Label text="Warrant reference"><input name="warrantRef" required minLength={3} maxLength={60} className={inputCls} /></Label>
          <Label text="Date issued"><input type="date" name="warrantIssuedAt" required max={today} defaultValue={today} className={inputCls} /></Label>
          <Label text="Next court date (remand)" hint="Adults: each remand is limited to 14 clear days. Expired warrants are flagged for follow-up — never released automatically."><input type="date" name="returnDate" className={inputCls} /></Label>
          <Label text="Issuing judicial officer"><input name="issuingJudicialOfficer" maxLength={120} className={inputCls} /></Label>
          <h2 className="font-semibold md:col-span-2">Gaoler&apos;s receipt (Form 22)</h2>
          <Label text="Received from (escorting officer)"><input name="escortingOfficer" required minLength={3} maxLength={120} placeholder="Rank, name, station" className={inputCls} /></Label>
          <Label text="Condition at handover"><input name="conditionAtHandover" required minLength={2} maxLength={200} placeholder="e.g. Sober, no visible injuries" className={inputCls} /></Label>
          <h2 className="font-semibold md:col-span-2">Reception medical screening</h2>
          <Label text="Screened by"><select name="screenedByRole" className={inputCls}><option value="">Not yet screened</option><option value="MEDICAL_OFFICER">Medical Officer</option><option value="PHYSICIAN_ASSISTANT">Physician Assistant</option></select></Label>
          <div className="flex items-end gap-6 pb-2 text-sm font-medium text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" name="fitForAdmission" defaultChecked className="h-4 w-4" /> Fit for admission</label><label className="flex items-center gap-2"><input type="checkbox" name="infectiousDiseaseFlag" className="h-4 w-4" /> Communicable disease concern</label></div>
          <h2 className="font-semibold md:col-span-2">Sentence (Forms 21 and 24 — as stated on the warrant)</h2>
          <Label text="Offence"><input name="offence" maxLength={200} className={inputCls} /></Label>
          <Label text="Sentence"><input name="sentenceText" maxLength={300} placeholder="e.g. 24 months imprisonment" className={inputCls} /></Label>
          <Label text="Term (months)"><input type="number" name="termMonths" min={0} max={1200} className={inputCls} /></Label>
          <Label text="Latest release date (as entered from the warrant)" hint="The system does not calculate release dates or remission."><input type="date" name="latestReleaseDate" className={inputCls} /></Label>
          <div className="md:col-span-2"><Button>I have verified the warrant — admit</Button></div>
        </form>
      </Card>
    </>
  );
}
