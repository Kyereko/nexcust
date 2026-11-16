'use server';
import { redirect } from 'next/navigation';
import { send } from '@/lib/api';

const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
const back = (path: string, params: Record<string, string | undefined>) => { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && u.set(k, v)); return `${path}?${u}`; };

/** Create an identity record. The API enforces duplicate review; this action only routes the officer. */
export async function createPerson(f: FormData) {
  const ws = s(f, 'ws') === 'prisons' ? 'prisons' : 'police';
  const formPath = `/${ws}/people/new`;
  const fields = { surname: s(f, 'surname'), otherNames: s(f, 'otherNames'), sex: s(f, 'sex'), dateOfBirth: s(f, 'dateOfBirth'), hometown: s(f, 'hometown'), identifierType: s(f, 'identifierValue') ? s(f, 'identifierType') : undefined, identifierValue: s(f, 'identifierValue') };
  const r = await send('POST', '/persons', { ...fields, confirmedNotDuplicate: s(f, 'confirmedNotDuplicate') === 'true' });
  if (r.ok) {
    const notice = `Identity record ${r.data.indexNumber} created.`;
    redirect(ws === 'prisons' ? back('/prisons/admissions', { personId: r.data.id, notice }) : back(`/police/people/${r.data.id}`, { notice }));
  }
  if (r.code === 'POSSIBLE_DUPLICATES') redirect(back(formPath, { ...fields, review: '1' }));
  redirect(back(formPath, { ...fields, error: r.message }));
}

/** Authorized exchange: ask the OTHER institution for a minimal summary. Purpose and basis are mandatory and logged. */
export async function requestExchange(f: FormData) {
  const returnTo = s(f, 'returnTo') ?? '/';
  const safe = returnTo.startsWith('/police/') || returnTo.startsWith('/prisons/') ? returnTo : '/';
  const [path, query] = safe.split('?'); const params = Object.fromEntries(new URLSearchParams(query ?? ''));
  const r = await send('POST', '/exchange/requests', { personId: s(f, 'personId'), providingInstitution: s(f, 'providingInstitution'), purpose: s(f, 'purpose'), legalBasis: s(f, 'legalBasis') });
  redirect(back(path, { ...params, ...(r.ok ? { exchange: r.data.id } : { error: r.message }) }));
}
