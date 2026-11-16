'use server';
import { redirect } from 'next/navigation';
import { send } from '@/lib/api';

const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
const back = (path: string, params: Record<string, string | undefined>) => { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && u.set(k, v)); return `${path}?${u}`; };

export async function createPerson(f: FormData) {
  const fields = { surname: s(f, 'surname'), otherNames: s(f, 'otherNames'), sex: s(f, 'sex'), dateOfBirth: s(f, 'dateOfBirth'), hometown: s(f, 'hometown'), identifierType: s(f, 'identifierValue') ? s(f, 'identifierType') : undefined, identifierValue: s(f, 'identifierValue') };
  const r = await send('POST', '/persons', { ...fields, confirmedNotDuplicate: s(f, 'confirmedNotDuplicate') === 'true' });
  if (r.ok) redirect(back(`/police/people/${r.data.id}`, { notice: `Identity record ${r.data.indexNumber} created.` }));
  if (r.code === 'POSSIBLE_DUPLICATES') redirect(back('/police/people/new', { ...fields, review: '1' }));
  redirect(back('/police/people/new', { ...fields, error: r.message }));
}

export async function registerArrest(f: FormData) {
  const personId = s(f, 'personId')!; const at = s(f, 'arrestedAt');
  const r = await send('POST', '/police/arrests', { personId, facilityId: s(f, 'facilityId'), arrestedAt: at ? new Date(`${at}:00Z`).toISOString() : undefined, // Ghana is GMT year-round
    suspectedOffence: s(f, 'suspectedOffence'), legalAuthority: s(f, 'legalAuthority'), location: s(f, 'location'), detain: f.get('detain') === 'on', cellRef: s(f, 'cellRef') });
  if (!r.ok) redirect(back('/police/custody/new', { personId, error: r.message }));
  redirect(r.data.custody ? back(`/police/custody/${r.data.custody.id}`, { notice: `Arrest ${r.data.arrest.reference} registered and custody episode opened.` })
    : back(`/police/people/${personId}`, { notice: `Arrest ${r.data.arrest.reference} registered (person not detained).` }));
}

export async function addMovement(f: FormData) {
  const id = s(f, 'id')!; const r = await send('POST', `/police/custody/${id}/movements`, { type: s(f, 'type'), toFacilityId: s(f, 'toFacilityId'), note: s(f, 'note') });
  redirect(back(`/police/custody/${id}`, r.ok ? { notice: 'Movement recorded.' } : { error: r.message }));
}
export async function reviewCustody(f: FormData) {
  const id = s(f, 'id')!; const r = await send('POST', `/police/custody/${id}/review`);
  redirect(back(`/police/custody/${id}`, r.ok ? { notice: 'Supervisor review recorded.' } : { error: r.message }));
}
export async function closeCustody(f: FormData) {
  const id = s(f, 'id')!; const r = await send('POST', `/police/custody/${id}/close`, { disposition: s(f, 'disposition'), dispositionNote: s(f, 'dispositionNote') });
  redirect(back(`/police/custody/${id}`, r.ok ? { notice: 'Custody episode closed with authorized disposition.' } : { error: r.message }));
}

export async function createCase(f: FormData) {
  const r = await send('POST', '/police/cases', { facilityId: s(f, 'facilityId'), title: s(f, 'title'), offenceCategory: s(f, 'offenceCategory'), incidentSummary: s(f, 'incidentSummary'), location: s(f, 'location') });
  redirect(r.ok ? back(`/police/cases/${r.data.id}`, { notice: `Case ${r.data.caseNumber} opened.` }) : back('/police/cases/new', { error: r.message }));
}
export async function updateCase(f: FormData) {
  const id = s(f, 'id')!; const r = await send('PATCH', `/police/cases/${id}`, { status: s(f, 'status') });
  redirect(back(`/police/cases/${id}`, r.ok ? { notice: 'Case status updated.' } : { error: r.message }));
}

export async function proposePosting(f: FormData) {
  const personnelId = s(f, 'personnelId')!; const r = await send('POST', '/police/postings', { personnelId, toOrgUnitId: s(f, 'toOrgUnitId'), reason: s(f, 'reason') });
  redirect(back(`/police/personnel/${personnelId}`, r.ok ? { notice: 'Posting proposed. It now awaits approval by an authorized supervisor.' } : { error: r.message }));
}
export async function decidePosting(f: FormData) {
  const id = s(f, 'id')!; const decision = s(f, 'decision') as 'approve' | 'confirm' | 'reject' | undefined;
  if (!decision || !['approve', 'confirm', 'reject'].includes(decision)) redirect(back('/police/postings', { error: 'Unknown action' }));
  const r = await send('POST', `/police/postings/${id}/${decision}`, decision === 'reject' ? { reason: s(f, 'reason') ?? 'Rejected by authorized officer' } : undefined);
  const done = { approve: 'Posting approved. It now awaits confirmation by the receiving command.', confirm: 'Posting confirmed. The officer\'s current posting has been updated.', reject: 'Posting rejected.' }[decision!];
  redirect(back('/police/postings', r.ok ? { notice: done } : { error: r.message }));
}
