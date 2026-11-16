'use server';
import { redirect } from 'next/navigation';
import { send } from '@/lib/api';

const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };

export async function apply(f: FormData) {
  const r = await send('POST', '/applicant/background-checks', { fullName: s(f, 'fullName'), dateOfBirth: s(f, 'dateOfBirth'), identifierType: s(f, 'identifierType'), identifierValue: s(f, 'identifierValue'), purpose: s(f, 'purpose') });
  const u = new URLSearchParams(r.ok ? { notice: `Application ${r.data.reference} submitted. You can follow its progress here.` } : { error: r.message });
  redirect(r.ok ? `/applicant/${r.data.id}?${u}` : `/applicant?${u}`);
}
