'use server';
import { redirect } from 'next/navigation';
import { send } from '@/lib/api';

const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
const back = (path: string, params: Record<string, string | undefined>) => { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && u.set(k, v)); return `${path}?${u}`; };

export async function registerArrest(f: FormData) {
  const personId = s(f, 'personId')!; const at = s(f, 'arrestedAt');
  const iso = (k: string) => { const v = s(f, k); return v ? new Date(`${v}:00Z`).toISOString() : undefined; }; // Ghana is GMT year-round
  const r = await send('POST', '/police/arrests', { personId, facilityId: s(f, 'facilityId'), arrestedAt: iso('arrestedAt'),
    suspectedOffence: s(f, 'suspectedOffence'), legalAuthority: s(f, 'legalAuthority'), location: s(f, 'location'), detain: f.get('detain') === 'on', cellRef: s(f, 'cellRef'),
    arrestBasis: s(f, 'arrestBasis'), warrantRef: s(f, 'warrantRef'), reasonsGivenAt: iso('reasonsGivenAt'), rightToLawyerGivenAt: iso('rightToLawyerGivenAt'),
    languageUsed: s(f, 'languageUsed'), lawyerRequested: f.get('lawyerRequested') === 'on' });
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
  const id = s(f, 'id')!; const disposition = s(f, 'disposition'); const reportAt = s(f, 'bailReportAt'); const deposit = s(f, 'bailDeposit');
  const bailBond = disposition === 'RELEASED_ON_BAIL' ? { amountGhs: Number(s(f, 'bailAmount') ?? NaN), reportTo: s(f, 'bailReportTo'), reportPlace: s(f, 'bailReportPlace'),
    reportAt: reportAt ? new Date(`${reportAt}:00Z`).toISOString() : undefined, depositInLieuGhs: deposit ? Number(deposit) : undefined,
    sureties: s(f, 'suretyName') ? [{ name: s(f, 'suretyName'), idRef: s(f, 'suretyId'), address: s(f, 'suretyAddress') }] : [] } : undefined;
  if (bailBond) {
    const missing = [!s(f, 'bailAmount') && 'bond amount', !reportAt && 'date and time to report', !s(f, 'bailReportPlace') && 'place to report',
      s(f, 'suretyName') && (!s(f, 'suretyId') || !s(f, 'suretyAddress')) && "surety's ID reference and address"].filter(Boolean);
    if (missing.length) redirect(back(`/police/custody/${id}`, { error: `Release on bail is recorded as a bond (Act 30 s.15(2)). Please enter: ${missing.join(', ')}.` }));
  }
  const r = await send('POST', `/police/custody/${id}/close`, { disposition, dispositionNote: s(f, 'dispositionNote'), bailBond });
  redirect(back(`/police/custody/${id}`, r.ok ? { notice: 'Custody episode closed with authorized disposition.' } : { error: r.message }));
}

export async function juvenileNotice(f: FormData) {
  const id = s(f, 'id')!; const at = s(f, 'notifiedAt');
  const r = await send('POST', `/police/custody/${id}/juvenile-notice`, { parentGuardianNotifiedAt: at ? new Date(`${at}:00Z`).toISOString() : undefined });
  redirect(back(`/police/custody/${id}`, r.ok ? { notice: 'Parent/guardian notification recorded.' } : { error: r.message }));
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

export async function advanceBgCheck(f: FormData) {
  const id = s(f, 'id')!; const stage = s(f, 'stage');
  const r = await send('POST', `/police/background-checks/${id}/advance`, { stage, note: s(f, 'note'), ...(stage === 'IDENTITY_VERIFIED' ? { personId: s(f, 'personId') } : {}) });
  redirect(back(`/police/background-checks/${id}`, r.ok ? { notice: `Recorded: ${stage?.replace(/_/g, ' ').toLowerCase()}.` } : { error: r.message }));
}
export async function decideBgCheck(f: FormData) {
  const id = s(f, 'id')!; const decision = s(f, 'decision') === 'REJECT' ? 'REJECT' : 'APPROVE';
  const r = await send('POST', `/police/background-checks/${id}/decision`, { decision, note: s(f, 'note') });
  redirect(back(`/police/background-checks/${id}`, r.ok ? { notice: decision === 'APPROVE' ? `Certificate ${r.data.certificateNumber} issued.` : 'Application rejected.' } : { error: r.message }));
}
