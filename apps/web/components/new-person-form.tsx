import Link from 'next/link';
import type { Paginated } from '@nexcust/contracts';
import { api, fmtDate, qs } from '@/lib/api';
import { Button, Card, Flash, Label, PageHeader, Table, inputCls } from '@/components/ui';
import { createPerson } from '@/app/(workspace)/person-actions';

/** Identity registration with mandatory duplicate review. `ws` decides where the officer goes next. */
export async function NewPersonForm({ ws, sp }: { ws: 'police' | 'prisons'; sp: Record<string, string | undefined> }) {
  const link = ws === 'police' ? 'text-brand' : 'text-brand'; const usePath = (id: string) => ws === 'police' ? `/police/people/${id}` : `/prisons/admissions?personId=${id}`; const review = sp.review === '1' && sp.surname;
  const matches = review ? (await api<Paginated<any>>(`/persons${qs({ q: sp.surname, pageSize: '20' })}`)).items : [];
  return (
    <>
      <Link href={ws === 'police' ? '/police/people' : '/prisons/admissions'} className={`text-sm ${link} hover:underline`}>← {ws === 'police' ? 'People & records' : 'Admissions'}</Link>
      <PageHeader title="Register new person" subtitle="Create an identity record only when no existing record matches" />
      <Flash sp={sp} />
      {review && (
        <Card className="mb-4 border-amber-300 p-5">
          <h2 className="font-semibold text-amber-900">Possible existing records — review before creating</h2>
          <p className="mt-1 text-sm text-slate-600">Records are never merged or matched automatically. If one of these is the same person, use that record. If none is, confirm below and a separate identity record will be created; your confirmation is audited.</p>
          <div className="mt-3"><Table head={['Index no.', 'Name', 'Sex', 'Date of birth', 'Hometown', '']}>
            {matches.map((p) => <tr key={p.id}><td className="font-medium">{p.indexNumber}</td><td>{p.surname}, {p.otherNames}</td><td>{p.sex}</td><td>{fmtDate(p.dateOfBirth)}</td><td>{p.hometown ?? '—'}</td>
              <td className="text-right"><Link prefetch={false} className={`${link} hover:underline`} href={usePath(p.id)}>Use this record</Link></td></tr>)}
          </Table></div>
        </Card>
      )}
      <Card className="p-5">
        <form action={createPerson} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="ws" value={ws} />
          {review && <input type="hidden" name="confirmedNotDuplicate" value="true" />}
          <Label text="Surname"><input name="surname" required minLength={2} maxLength={80} defaultValue={sp.surname} className={inputCls} /></Label>
          <Label text="Other names"><input name="otherNames" required minLength={2} maxLength={120} defaultValue={sp.otherNames} className={inputCls} /></Label>
          <Label text="Sex"><select name="sex" defaultValue={sp.sex ?? 'MALE'} className={inputCls}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="UNKNOWN">Unknown</option></select></Label>
          <Label text="Date of birth"><input type="date" name="dateOfBirth" defaultValue={sp.dateOfBirth} className={inputCls} /></Label>
          <Label text="Hometown"><input name="hometown" maxLength={80} defaultValue={sp.hometown} className={inputCls} /></Label>
          <div />
          <Label text="Identifier type"><select name="identifierType" defaultValue={sp.identifierType ?? 'GHANA_CARD'} className={inputCls}><option value="GHANA_CARD">Ghana Card</option><option value="PASSPORT">Passport</option><option value="DRIVERS_LICENCE">Driver&apos;s licence</option><option value="VOTER_ID">Voter ID</option><option value="OTHER">Other</option></select></Label>
          <Label text="Identifier number (optional)" hint="Use a made-up value, never a real ID number."><input name="identifierValue" maxLength={40} defaultValue={sp.identifierValue} className={inputCls} /></Label>
          <div className="md:col-span-2"><Button>{review ? 'Confirm this is a different person and create record' : 'Check for existing records and create'}</Button></div>
        </form>
      </Card>
    </>
  );
}
