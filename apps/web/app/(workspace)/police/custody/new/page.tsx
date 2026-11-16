import Link from 'next/link';
import { api, fmtDate } from '@/lib/api';
import { Button, Card, Field, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { registerArrest } from '../../actions';

export default async function NewArrest({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (!sp.personId) return (
    <>
      <PageHeader title="Register arrest" subtitle="Step 1 — find the person" />
      <Card className="p-8 text-sm text-slate-700">Search the National Person Index first and choose <b>Register arrest</b> on the matching record. Create a new identity record only when no existing record matches.
        <div className="mt-4"><Link href="/police/people" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">Search people & records</Link></div></Card>
    </>
  );
  const [{ person: p }, stations] = await Promise.all([api<any>(`/police/persons/${sp.personId}/record`), api<any[]>('/police/stations')]);
  const now = new Date().toISOString().slice(0, 16);
  return (
    <>
      <Link href="/police/people" className="text-sm text-brand hover:underline">← People & records</Link>
      <PageHeader title="Register arrest" subtitle="Step 2 — arrest particulars and detention" />
      <Flash sp={sp} />
      <Card className="mb-4 p-5"><dl className="grid grid-cols-2 gap-4 md:grid-cols-4"><Field label="Person">{p.surname}, {p.otherNames}</Field><Field label="Index no.">{p.indexNumber}</Field><Field label="Sex">{p.sex}</Field><Field label="Date of birth">{fmtDate(p.dateOfBirth)}</Field></dl></Card>
      <Card className="p-5">
        <form action={registerArrest} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="personId" value={p.id} />
          <Label text="Station"><select name="facilityId" required className={inputCls}>{stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Label>
          <Label text="Date and time of arrest (GMT)"><input type="datetime-local" name="arrestedAt" required defaultValue={now} max={now} className={inputCls} /></Label>
          <Label text="Suspected offence"><input name="suspectedOffence" required minLength={3} maxLength={200} className={inputCls} /></Label>
          <Label text="Place of arrest"><input name="location" maxLength={200} className={inputCls} /></Label>
          <Label text="Basis of arrest (Act 30)"><select name="arrestBasis" className={inputCls}><option value="WITHOUT_WARRANT_S10">Without warrant — s.10</option><option value="WARRANT">Under warrant</option><option value="PRIVATE_PERSON_S12">By a private person — s.12</option></select></Label>
          <Label text="Warrant reference (if under warrant)"><input name="warrantRef" maxLength={80} className={inputCls} /></Label>
          <div className="md:col-span-2"><Label text="Legal authority for the arrest" hint="Recorded as stated by the arresting officer. The system does not assess lawfulness."><textarea name="legalAuthority" required minLength={3} maxLength={500} rows={2} className={inputCls} /></Label></div>
          <h2 className="font-semibold text-brand md:col-span-2">Information given to the person (Constitution art. 14(2))</h2>
          <Label text="Reasons for arrest given at (GMT)"><input type="datetime-local" name="reasonsGivenAt" required defaultValue={now} max={now} className={inputCls} /></Label>
          <Label text="Right to a lawyer explained at (GMT)"><input type="datetime-local" name="rightToLawyerGivenAt" required defaultValue={now} max={now} className={inputCls} /></Label>
          <Label text="Language used"><input name="languageUsed" required minLength={2} maxLength={60} placeholder="e.g. Twi, Ewe, Ga, English" className={inputCls} /></Label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input type="checkbox" name="lawyerRequested" className="h-4 w-4" /> Person asked for a lawyer</label>
          <h2 className="font-semibold text-brand md:col-span-2">Detention</h2>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" name="detain" defaultChecked className="h-4 w-4" /> Person is detained — open a custody episode</label>
          <Label text="Cell (if detained)"><input name="cellRef" maxLength={40} placeholder="e.g. Cell 2" className={inputCls} /></Label>
          <p className="text-xs text-slate-500 md:col-span-2">The 48-hour period for production before a court runs from the time of arrest, including weekends and public holidays. A person under 18 is flagged as a juvenile.</p>
          <div className="md:col-span-2"><Button>Register arrest</Button></div>
        </form>
      </Card>
    </>
  );
}
