/** Clearance stages with the labels used on the GPS eServices portal (docs/research/10, C-04). */
export const BG_STATUSES = ['SUBMITTED', 'PAYMENT_CONFIRMED', 'APPOINTMENT_BOOKED', 'BIOMETRICS_CAPTURED', 'RECORDS_SEARCHED', 'UNDER_INVESTIGATION', 'ADDITIONAL_INFO_REQUESTED',
  'UNDER_REVIEW', 'CERTIFICATE_ISSUED', 'DISPATCHED', 'REJECTED'];
export const BG_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted', PAYMENT_CONFIRMED: 'Payment confirmed', APPOINTMENT_BOOKED: 'Appointment booked', BIOMETRICS_CAPTURED: 'Attended — fingerprints taken',
  RECORDS_SEARCHED: 'Criminal ident recorded', UNDER_INVESTIGATION: 'Under investigation', ADDITIONAL_INFO_REQUESTED: 'Additional information requested',
  UNDER_REVIEW: 'Ready for signature', CERTIFICATE_ISSUED: 'Certificate completed', DISPATCHED: 'Dispatched — Ghana Post', REJECTED: 'Rejected',
  VALIDATED: 'Payment confirmed', IDENTITY_VERIFIED: 'Attended — fingerprints taken', APPROVED: 'Approved', WITHDRAWN: 'Withdrawn',
};
export const bgTone = (s: string) => ({ SUBMITTED: 'amber', UNDER_INVESTIGATION: 'red', ADDITIONAL_INFO_REQUESTED: 'amber', UNDER_REVIEW: 'blue', CERTIFICATE_ISSUED: 'green', DISPATCHED: 'green', REJECTED: 'red' } as Record<string, string>)[s];
export const IDENT_LABEL: Record<string, string> = { IDENT: 'Ident — record found', NOT_IDENT: 'Not ident', NOT_RECORDED: 'Not recorded' };
/** Applicants see the portal's coarse statuses only. */
export const applicantTone = (s: string) => (['CERTIFICATE_ISSUED', 'DISPATCHED'].includes(s) ? 'green' : s === 'REJECTED' ? 'red' : 'amber');
export const applicantStatus = (s: string) => ({ CERTIFICATE_ISSUED: 'COMPLETED', DISPATCHED: 'DISPATCHED', REJECTED: 'NOT ISSUED', ADDITIONAL_INFO_REQUESTED: 'ADDITIONAL INFORMATION REQUESTED',
  BIOMETRICS_CAPTURED: 'ATTENDED', APPOINTMENT_BOOKED: 'APPOINTMENT BOOKED' } as Record<string, string>)[s] ?? 'IN PROGRESS';
/** Whole business days between two dates (Mon–Fri; public holidays not modelled). */
export function businessDays(from: Date, to = new Date()) {
  let n = 0; const d = new Date(from); d.setUTCHours(0, 0, 0, 0); const end = new Date(to); end.setUTCHours(0, 0, 0, 0);
  while (d < end) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}
