/**
 * Ghana institutional reference data — seeded into configurable tables, never hard-coded in logic.
 * Every row carries the evidence status from docs/research/08-evidence-register.md.
 * V = VERIFIED (read in an authoritative source excerpt), P = PROVISIONAL, U = UNCONFIRMED.
 * Rank lists were read as OCR excerpts of the gazette schedules: confirm against a gazette copy.
 */
type S = 'VERIFIED' | 'PROVISIONAL' | 'UNCONFIRMED';
const CI76 = 'Police Service Regulations, 2012 (C.I. 76), 2nd/3rd Schedules';
const CI92 = 'Prisons Service (General Administration) Regulations, 2016 (C.I. 92), 2nd/3rd Schedules';

export const POLICE_RANKS: Array<[code: string, name: string, abbr: string | null, category: string, status: S, notes?: string]> = [
  ['IGP', 'Inspector-General of Police', 'IGP', 'SENIOR', 'VERIFIED'],
  ['DIGP', 'Deputy Inspector-General of Police', null, 'SENIOR', 'VERIFIED', 'Abbreviation unconfirmed'],
  ['COP', 'Commissioner of Police', 'COP', 'SENIOR', 'VERIFIED'],
  ['DCOP', 'Deputy Commissioner of Police', 'DCOP', 'SENIOR', 'VERIFIED'],
  ['ACP', 'Assistant Commissioner of Police', 'ACP', 'SENIOR', 'VERIFIED'],
  ['CSUPT', 'Chief Superintendent of Police', 'C/Supt.', 'SENIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['SUPT', 'Superintendent of Police', 'Supt.', 'SENIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['DSP', 'Deputy Superintendent of Police', 'DSP', 'SENIOR', 'VERIFIED'],
  ['ASP', 'Assistant Superintendent of Police', 'ASP', 'SENIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['CINSP', 'Chief Inspector', 'C/Insp.', 'JUNIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['INSP', 'Inspector', 'Insp.', 'JUNIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['RSM', 'Regional Sergeant Major', 'RSM', 'JUNIOR', 'PROVISIONAL', 'Scheduled in C.I. 76 3rd Schedule; rank vs appointment in practice unconfirmed'],
  ['DSM', 'District Sergeant Major', 'DSM', 'JUNIOR', 'PROVISIONAL', 'Scheduled in C.I. 76 3rd Schedule; rank vs appointment in practice unconfirmed'],
  ['SGT', 'Sergeant', 'Sgt.', 'JUNIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['CPL', 'Corporal', 'Cpl.', 'JUNIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['LCPL', 'Lance Corporal', 'L/Cpl.', 'JUNIOR', 'VERIFIED', 'Abbreviation provisional'],
  ['CONST', 'Constable', 'Const.', 'JUNIOR', 'VERIFIED', 'Abbreviation provisional'],
];

export const PRISON_RANKS: Array<[string, string, string, string, S]> = [
  ['DG', 'Director-General of Prisons', 'DG', 'COMMISSIONED', 'VERIFIED'],
  ['DDGP', 'Deputy Director-General of Prisons', 'DDGP', 'COMMISSIONED', 'VERIFIED'],
  ['DOP', 'Director of Prisons', 'DOP', 'COMMISSIONED', 'VERIFIED'],
  ['DDP', 'Deputy Director of Prisons', 'DDP', 'COMMISSIONED', 'VERIFIED'],
  ['ADP', 'Assistant Director of Prisons', 'ADP', 'COMMISSIONED', 'VERIFIED'],
  ['CSUPT', 'Chief Superintendent of Prisons', 'C/SUPT', 'COMMISSIONED', 'VERIFIED'],
  ['SUPT', 'Superintendent of Prisons', 'SUPT', 'COMMISSIONED', 'VERIFIED'],
  ['DSP', 'Deputy Superintendent of Prisons', 'DSP', 'COMMISSIONED', 'VERIFIED'],
  ['ASP', 'Assistant Superintendent of Prisons', 'ASP', 'COMMISSIONED', 'VERIFIED'],
  ['SCO', 'Senior Chief Officer', 'SCO', 'NON_COMMISSIONED', 'VERIFIED'],
  ['CO', 'Chief Officer', 'CO', 'NON_COMMISSIONED', 'VERIFIED'],
  ['ACO', 'Assistant Chief Officer', 'ACO', 'NON_COMMISSIONED', 'VERIFIED'],
  ['SGT', 'Sergeant', 'SGT', 'NON_COMMISSIONED', 'VERIFIED'],
  ['CPL', 'Corporal', 'CPL', 'NON_COMMISSIONED', 'VERIFIED'],
  ['LCPL', 'Lance Corporal', 'L/CPL', 'NON_COMMISSIONED', 'VERIFIED'],
  ['2CO', 'Second Class Officer', '2CO', 'NON_COMMISSIONED', 'VERIFIED'],
];
export const RANK_SOURCES = { POLICE: CI76, PRISONS: CI92 };

export const ORG_UNIT_TYPES: Record<'POLICE' | 'PRISONS', Array<[code: string, name: string, level: number, status: S, src: string]>> = {
  POLICE: [
    ['NATIONAL_HQ', 'National Headquarters', 1, 'VERIFIED', 'police.gov.gh; C.I. 76 reg. 1'],
    ['DIRECTORATE', 'Directorate', 2, 'VERIFIED', 'C.I. 76 reg. 1(2); police.gov.gh (current list differs — unconfirmed)'],
    ['REGIONAL_COMMAND', 'Regional Command', 2, 'VERIFIED', 'C.I. 76 definition of "Region"; police.gov.gh'],
    ['DIVISION', 'Division', 3, 'VERIFIED', 'police.gov.gh Accra/Tema region pages'],
    ['DISTRICT', 'District', 4, 'VERIFIED', 'police.gov.gh Accra/Tema region pages'],
    ['STATION', 'Station / Post', 5, 'VERIFIED', 'police.gov.gh; how a Post reports is unconfirmed'],
  ],
  PRISONS: [
    ['NATIONAL_HQ', 'Prisons Headquarters', 1, 'VERIFIED', 'ghanaprisons.gov.gh'],
    ['DIRECTORATE', 'Directorate', 2, 'PROVISIONAL', 'ghanaprisons.gov.gh departments page'],
    ['REGIONAL_COMMAND', 'Regional Command', 2, 'VERIFIED', 'C.I. 92 reg. 38; ghanaprisons.gov.gh'],
    ['ESTABLISHMENT', 'Prison Establishment (Station)', 3, 'VERIFIED', 'C.I. 92; ghanaprisons.gov.gh'],
  ],
};

export const FACILITY_TYPES: Record<'POLICE' | 'PRISONS', Array<[code: string, name: string, status: S]>> = {
  POLICE: [['STATION', 'Police Station', 'VERIFIED'], ['POST', 'Police Post', 'VERIFIED']],
  PRISONS: [
    ['CENTRAL', 'Central Prison', 'VERIFIED'], ['LOCAL', 'Local Prison', 'VERIFIED'], ['FEMALE', 'Female Prison', 'VERIFIED'],
    ['CAMP', 'Camp Prison / Settlement Camp Prison', 'VERIFIED'], ['MEDIUM_SECURITY', 'Medium Security Prison', 'VERIFIED'],
    ['MAXIMUM_SECURITY', 'Maximum Security Prison', 'VERIFIED'], ['ANNEX', 'Annex Prison', 'VERIFIED'],
    ['COMMUNICABLE_DISEASE', 'Communicable Disease Prison', 'VERIFIED'], ['SENIOR_CORRECTIONAL_CENTRE', 'Senior Correctional Centre', 'VERIFIED'],
  ],
};

export const APPOINTMENTS: Record<'POLICE' | 'PRISONS', Array<[code: string, title: string, command: boolean, status: S, src: string]>> = {
  POLICE: [
    ['DIRECTOR_GENERAL', 'Director-General (Directorate)', true, 'VERIFIED', 'police.gov.gh (e.g. Director-General, CID)'],
    ['REGIONAL_COMMANDER', 'Regional Commander', true, 'VERIFIED', 'police.gov.gh Regional Commanders'],
    ['DIVISIONAL_COMMANDER', 'Divisional Commander', true, 'VERIFIED', 'police.gov.gh'],
    ['DISTRICT_COMMANDER', 'District Commander', true, 'VERIFIED', 'police.gov.gh'],
    ['STATION_OFFICER', 'Station Officer', true, 'UNCONFIRMED', 'Title of the officer commanding a station requires stakeholder confirmation'],
  ],
  PRISONS: [
    ['REGIONAL_COMMANDER', 'Regional Commander', true, 'VERIFIED', 'C.I. 92 reg. 38'],
    ['OFFICER_IN_CHARGE', 'Officer-in-Charge (Commander of a Station)', true, 'VERIFIED', 'ghanaprisons.gov.gh usage; C.I. 92 "commander of a Station"; appointing authority unconfirmed'],
  ],
};

/** Administrative regions (geography only). */
export const ADMIN_REGIONS = ['Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra', 'North East', 'Northern',
  'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta', 'Western', 'Western North'];

/** Police regional commands as listed on police.gov.gh navigation (25) — currency to be confirmed. */
export const POLICE_REGIONAL_COMMANDS = ['Accra', 'Tema', 'Ashanti', 'Ashanti North', 'Ashanti South', 'Ahafo', 'Bono', 'Bono East', 'Central',
  'Central East', 'Central North', 'Eastern', 'Eastern North', 'Eastern South', 'North East', 'Northern', 'Oti', 'Savannah', 'Upper East',
  'Upper West', 'Volta', 'Volta North', 'Western', 'Western North', 'Western Central'];

/** Prisons regional commands used for the demo tree (subset seen on ghanaprisons.gov.gh). */
export const PRISON_REGIONAL_COMMANDS_DEMO = ['Ashanti', 'Northern', 'Western'];

/**
 * Police clearance service catalogue as published on eservices.police.gov.gh (read 16 Nov 2026, docs/research/10 C-01/C-02).
 * Fees in GHS; add-on = "Passport Photo and Certificate Delivery fee". Display only — NEXCUST takes no payment.
 */
export const CLEARANCE_SERVICE_TYPES: Array<{ code: string; name: string; vettingFeeGhs: number; addOnFeeGhs: number; available: boolean; requiresFingerprints: boolean; status: S; note?: string }> = [
  { code: 'ORDINARY_RESIDENT', name: 'Ordinary Vetting or Immigration Permit (Resident)', vettingFeeGhs: 150, addOnFeeGhs: 70, available: true, requiresFingerprints: true, status: 'VERIFIED' },
  { code: 'ORDINARY_NON_RESIDENT', name: 'Ordinary Vetting or Immigration Permit (Non-Resident)', vettingFeeGhs: 2000, addOnFeeGhs: 70, available: true, requiresFingerprints: true, status: 'VERIFIED' },
  { code: 'NOMINAL_NON_RESIDENT', name: 'Nominal Vetting (Non-Resident)', vettingFeeGhs: 2000, addOnFeeGhs: 70, available: true, requiresFingerprints: false, status: 'VERIFIED', note: 'Via a representative on CID Form 196, without fingerprints' },
  { code: 'EMPLOYMENT', name: 'Employment Vetting', vettingFeeGhs: 100, addOnFeeGhs: 70, available: true, requiresFingerprints: true, status: 'VERIFIED' },
  { code: 'AUTHENTICATION', name: 'Authentication of Police Clearance', vettingFeeGhs: 50, addOnFeeGhs: 0, available: false, requiresFingerprints: false, status: 'VERIFIED', note: 'Listed as "coming soon" online' },
  { code: 'BOARD_BOG', name: 'Vetting Board of Directors (Bank of Ghana)', vettingFeeGhs: 0, addOnFeeGhs: 0, available: false, requiresFingerprints: true, status: 'VERIFIED', note: 'Coming soon; fee not published' },
  { code: 'BOARD_EDUCATION', name: 'Vetting Board of Directors (Education)', vettingFeeGhs: 0, addOnFeeGhs: 0, available: false, requiresFingerprints: true, status: 'VERIFIED', note: 'Coming soon; fee not published' },
  { code: 'BOARD_SEC', name: 'Vetting Board of Directors (SEC)', vettingFeeGhs: 0, addOnFeeGhs: 0, available: false, requiresFingerprints: true, status: 'VERIFIED', note: 'Coming soon; fee not published' },
  { code: 'ADOPTION', name: 'Adoption Vetting', vettingFeeGhs: 0, addOnFeeGhs: 0, available: false, requiresFingerprints: true, status: 'VERIFIED', note: 'Coming soon; fee not published' },
];
export const CLEARANCE_SOURCE = 'eservices.police.gov.gh (public portal, read 16 Nov 2026)';
/** Demo signatory. Title PROVISIONAL (press, Apr 2026); "for: Director-General, CID" to be confirmed with CID. */
export const CLEARANCE_SIGNATORY = { email: 'police.national@nexcust.demo', signatoryTitle: 'Director in charge of Administration, CID (demonstration)', signsFor: 'Director-General, CID' };
