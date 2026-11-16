export const BG_STATUSES = ['SUBMITTED', 'VALIDATED', 'IDENTITY_VERIFIED', 'RECORDS_SEARCHED', 'UNDER_REVIEW', 'CERTIFICATE_ISSUED', 'REJECTED'];
export const bgTone = (s: string) => ({ SUBMITTED: 'amber', UNDER_REVIEW: 'blue', CERTIFICATE_ISSUED: 'green', REJECTED: 'red' } as Record<string, string>)[s];
/** Applicants see a coarse status only. */
export const applicantTone = (s: string) => (s === 'CERTIFICATE_ISSUED' ? 'green' : s === 'REJECTED' ? 'red' : 'amber');
export const applicantStatus = (s: string) => (s === 'CERTIFICATE_ISSUED' ? 'CERTIFICATE ISSUED' : s === 'REJECTED' ? 'NOT ISSUED' : 'IN PROGRESS');
