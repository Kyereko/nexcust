import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Card, Flash, Label, PageHeader, inputCls } from '@/components/ui';
import { createCase } from '../../actions';

export default async function NewCase({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const stations = await api<any[]>('/police/stations');
  return (
    <>
      <Link href="/police/cases" className="text-sm text-blue-700 hover:underline">← Cases & investigations</Link>
      <PageHeader title="Open a case" subtitle="Records the reported incident and opens the investigation" />
      <Flash sp={sp} />
      <Card className="p-5"><form action={createCase} className="grid gap-4 md:grid-cols-2">
        <Label text="Station"><select name="facilityId" required className={inputCls}>{stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Label>
        <Label text="Offence category"><input name="offenceCategory" required minLength={3} maxLength={100} className={inputCls} /></Label>
        <div className="md:col-span-2"><Label text="Case title"><input name="title" required minLength={5} maxLength={200} className={inputCls} /></Label></div>
        <div className="md:col-span-2"><Label text="Incident summary"><textarea name="incidentSummary" required minLength={10} maxLength={2000} rows={3} className={inputCls} /></Label></div>
        <Label text="Location"><input name="location" maxLength={200} className={inputCls} /></Label>
        <div className="md:col-span-2"><Button>Open case</Button></div>
      </form></Card>
    </>
  );
}
