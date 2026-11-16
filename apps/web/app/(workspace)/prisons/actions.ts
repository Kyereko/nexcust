'use server';
import { redirect } from 'next/navigation';
import { send } from '@/lib/api';

const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
const back = (path: string, params: Record<string, string | undefined>) => { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && u.set(k, v)); return `${path}?${u}`; };
const ok = (r: { ok: boolean; message: string }, notice: string) => (r.ok ? { notice } : { error: r.message });

/** Workflow D: admission against a verified remand or committal warrant. */
export async function admit(f: FormData) {
  const personId = s(f, 'personId')!; const term = s(f, 'termMonths');
  const r = await send('POST', '/prisons/admissions', {
    personId, facilityId: s(f, 'facilityId'), housingUnitId: s(f, 'housingUnitId'), warrantType: s(f, 'warrantType'), court: s(f, 'court'), warrantRef: s(f, 'warrantRef'),
    issuingJudicialOfficer: s(f, 'issuingJudicialOfficer'), escortingOfficer: s(f, 'escortingOfficer'), conditionAtHandover: s(f, 'conditionAtHandover'),
    screenedByRole: s(f, 'screenedByRole'), fitForAdmission: s(f, 'screenedByRole') ? f.get('fitForAdmission') === 'on' : undefined, infectiousDiseaseFlag: f.get('infectiousDiseaseFlag') === 'on',
    warrantIssuedAt: s(f, 'warrantIssuedAt'), returnDate: s(f, 'returnDate'), offence: s(f, 'offence'), sentenceText: s(f, 'sentenceText'),
    termMonths: term ? Number(term) : undefined, latestReleaseDate: s(f, 'latestReleaseDate'),
  });
  if (!r.ok) redirect(back('/prisons/admissions', { personId, error: r.message }));
  redirect(back(`/prisons/prisoners/${r.data.episode.id}`, { notice: `Admitted as ${r.data.prisonerRecord.prisonerNumber} (admission ${r.data.admission.reference}).` }));
}

export async function assignHousing(f: FormData) {
  const id = s(f, 'episodeId')!; const r = await send('POST', `/prisons/prisoners/${id}/housing`, { housingUnitId: s(f, 'housingUnitId') });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, 'Housing assignment updated.')));
}
export async function initiateTransfer(f: FormData) {
  const id = s(f, 'episodeId')!; const r = await send('POST', '/prisons/transfers', { episodeId: id, toFacilityId: s(f, 'toFacilityId'), reason: s(f, 'reason') });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, `Transfer ${r.data?.reference ?? ''} initiated. It now awaits approval by an authorized officer.`)));
}
export async function initiateRelease(f: FormData) {
  const id = s(f, 'episodeId')!; const r = await send('POST', '/prisons/releases', { episodeId: id, type: s(f, 'type'), legalAuthority: s(f, 'legalAuthority'), dischargeBoardReviewed: f.get('dischargeBoardReviewed') === 'on' });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, `Release ${r.data?.reference ?? ''} initiated. It now awaits authorization by a second officer.`)));
}
export async function renewRemand(f: FormData) {
  const id = s(f, 'episodeId')!;
  const r = await send('POST', `/prisons/prisoners/${id}/remand-renewals`, { court: s(f, 'court'), warrantRef: s(f, 'warrantRef'), issuingJudicialOfficer: s(f, 'issuingJudicialOfficer'), issuedAt: s(f, 'issuedAt'), returnDate: s(f, 'returnDate') });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, 'Remand warrant renewal recorded.')));
}
export async function setRemission(f: FormData) {
  const id = s(f, 'episodeId')!; const r = await send('POST', `/prisons/sentences/${s(f, 'sentenceId')}/remission`, { remissionEligible: s(f, 'remissionEligible') === 'true' });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, 'Remission eligibility recorded.')));
}
export async function forfeitRemission(f: FormData) {
  const id = s(f, 'episodeId')!; const days = s(f, 'days');
  const r = await send('POST', `/prisons/sentences/${s(f, 'sentenceId')}/forfeitures`, { days: days ? Number(days) : undefined, reason: s(f, 'reason'), forfeitedOn: s(f, 'forfeitedOn') });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, 'Forfeiture of remission recorded.')));
}
export async function warrantReturned(f: FormData) {
  const r = await send('POST', `/prisons/releases/${s(f, 'id')}/warrant-returned`);
  redirect(back('/prisons/transfers', ok(r, 'Warrant recorded as returned to the issuing court.')));
}

export async function enroll(f: FormData) {
  const id = s(f, 'episodeId')!; const r = await send('POST', '/prisons/rehabilitation/enrollments', { episodeId: id, programmeId: s(f, 'programmeId') });
  redirect(back(`/prisons/prisoners/${id}`, ok(r, 'Enrolled in programme.')));
}

/** Decisions on the Transfers & Releases page. */
export async function decide(f: FormData) {
  const kind = s(f, 'kind'); const id = s(f, 'id'); const decision = s(f, 'decision');
  const allowed: Record<string, string[]> = { transfer: ['approve', 'reject', 'receive'], release: ['approve', 'reject'] };
  if (!kind || !id || !decision || !allowed[kind]?.includes(decision)) redirect(back('/prisons/transfers', { error: 'Unknown action' }));
  const r = await send('POST', `/prisons/${kind}s/${id}/${decision}`, decision === 'reject' ? { reason: 'Rejected by authorized officer' } : undefined);
  const done: Record<string, string> = { 'transfer:approve': 'Transfer approved — prisoner dispatched and in transit.', 'transfer:receive': 'Arrival confirmed. The prisoner is now on this establishment\'s register.',
    'transfer:reject': 'Transfer rejected.', 'release:approve': 'Release authorized and completed. The custody episode is closed.', 'release:reject': 'Release request rejected.' };
  redirect(back('/prisons/transfers', ok(r, done[`${kind}:${decision}`])));
}

export async function proposePosting(f: FormData) {
  const personnelId = s(f, 'personnelId')!; const r = await send('POST', '/prisons/postings', { personnelId, toOrgUnitId: s(f, 'toOrgUnitId'), reason: s(f, 'reason') });
  redirect(back(`/prisons/personnel/${personnelId}`, ok(r, 'Posting proposed. It now awaits approval by an authorized supervisor.')));
}
export async function decidePosting(f: FormData) {
  const id = s(f, 'id')!; const decision = s(f, 'decision') as 'approve' | 'confirm' | 'reject' | undefined;
  if (!decision || !['approve', 'confirm', 'reject'].includes(decision)) redirect(back('/prisons/postings', { error: 'Unknown action' }));
  const r = await send('POST', `/prisons/postings/${id}/${decision}`, decision === 'reject' ? { reason: 'Rejected by authorized officer' } : undefined);
  const done = { approve: 'Posting approved. It now awaits confirmation by the receiving command.', confirm: 'Posting confirmed. The officer\'s current posting has been updated.', reject: 'Posting rejected.' }[decision!];
  redirect(back('/prisons/postings', ok(r, done)));
}
