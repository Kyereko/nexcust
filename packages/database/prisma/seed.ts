/* eslint-disable no-console */
/**
 * NEXCUST — synthetic DEMONSTRATION seed.
 *  - Institutional reference data comes from reference/ghana-reference.ts (evidence-tagged).
 *  - Everything operational (people, officers, cases, custody) is SYNTHETIC: generated from a
 *    fixed PRNG, flagged isSynthetic, and prefixed DEMO- so it cannot be mistaken for a real record.
 *  - Demo stations / prisons are fictional ("DEMO …") nodes hung under real command names.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PERMISSIONS, ROLES } from '@nexcust/contracts';
import { hashPassword } from '../src/password';
import * as REF from '../reference/ghana-reference';

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';

// ── deterministic PRNG ──
let s = 20261116;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;
const pad = (n: number, w: number) => String(n).padStart(w, '0');
const NOW = new Date();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);
const dateOnly = (d: Date) => new Date(d.toISOString().slice(0, 10));

const SURNAMES = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Appiah', 'Agyeman', 'Amoah', 'Adjei', 'Tetteh', 'Lamptey', 'Quaye', 'Nartey', 'Addo', 'Ofori', 'Darko', 'Acheampong', 'Antwi', 'Gyamfi', 'Yeboah', 'Abubakari', 'Mahama', 'Alhassan', 'Issah', 'Fuseini', 'Agbeko', 'Dzidzornu', 'Kpodo', 'Amegashie', 'Awuni', 'Atinga', 'Bawa', 'Danso', 'Frimpong', 'Sarpong', 'Opoku', 'Bonsu', 'Ansah', 'Essien', 'Quansah'];
const MALE = ['Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kwabena', 'Kwesi', 'Kojo', 'Ebo', 'Fiifi', 'Nii', 'Selorm', 'Elikem', 'Abdul', 'Ibrahim', 'Mohammed', 'Emmanuel', 'Samuel', 'Daniel', 'Isaac', 'Joseph', 'Bright', 'Prince', 'Richmond', 'Clement'];
const FEMALE = ['Ama', 'Akosua', 'Abena', 'Adwoa', 'Yaa', 'Afia', 'Esi', 'Efua', 'Araba', 'Naa', 'Dzifa', 'Mawusi', 'Fatima', 'Amina', 'Hawa', 'Grace', 'Mercy', 'Comfort', 'Patience', 'Gifty', 'Linda', 'Priscilla', 'Rita', 'Vida'];
const TOWNS = ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Ho', 'Koforidua', 'Sunyani', 'Bolgatanga', 'Wa', 'Tema', 'Obuasi', 'Techiman', 'Nkawkaw', 'Winneba'];
const OFFENCES = ['Stealing', 'Assault', 'Causing unlawful damage', 'Defrauding by false pretences', 'Unlawful entry', 'Robbery', 'Threat of harm', 'Dishonestly receiving', 'Careless driving', 'Possession of narcotic drugs'];
const COURTS = ['DEMO Circuit Court A', 'DEMO Circuit Court B', 'DEMO District Court 1', 'DEMO District Court 2', 'DEMO High Court'];

function name() {
  const female = chance(0.3);
  return { sex: female ? 'FEMALE' as const : 'MALE' as const, surname: pick(SURNAMES), otherNames: `${pick(female ? FEMALE : MALE)}${chance(0.4) ? ' ' + pick(female ? FEMALE : MALE) : ''}` };
}

async function main() {
  if (await prisma.institution.count()) {
    await syncRbac();
    await syncClearanceReference();
    console.log('Database already seeded — roles and permissions synchronised with @nexcust/contracts (use `pnpm db:reset` to rebuild data).');
    return;
  }
  console.log('Seeding NEXCUST DEMONSTRATION data…');
  // ── institutions & reference data ──
  const inst = {
    POLICE: await prisma.institution.create({ data: { code: 'POLICE', name: 'Ghana Police Service (demonstration)' } }),
    PRISONS: await prisma.institution.create({ data: { code: 'PRISONS', name: 'Ghana Prisons Service (demonstration)' } }),
  };
  const regions = new Map<string, string>();
  for (const r of REF.ADMIN_REGIONS) {
    const row = await prisma.region.create({ data: { code: r.toUpperCase().replace(/ /g, '_'), name: r } });
    regions.set(r, row.id);
  }
  const unitType: Record<string, string> = {}; const facType: Record<string, string> = {}; const rank: Record<string, string> = {}; const appt: Record<string, string> = {};
  for (const code of ['POLICE', 'PRISONS'] as const) {
    for (const [c, n, level, st, src] of REF.ORG_UNIT_TYPES[code]) unitType[`${code}:${c}`] = (await prisma.orgUnitType.create({ data: { institutionId: inst[code].id, code: c, name: n, level, verificationStatus: st, sourceRef: src } })).id;
    for (const [c, n, st] of REF.FACILITY_TYPES[code]) facType[`${code}:${c}`] = (await prisma.facilityType.create({ data: { institutionId: inst[code].id, code: c, name: n, verificationStatus: st, sourceRef: 'docs/research/04-organisational-hierarchy.md' } })).id;
    for (const [c, t, cmd, st, src] of REF.APPOINTMENTS[code]) appt[`${code}:${c}`] = (await prisma.appointment.create({ data: { institutionId: inst[code].id, code: c, title: t, isCommand: cmd, verificationStatus: st, sourceRef: src } })).id;
  }
  REF.POLICE_RANKS.forEach(([c, n, a, cat, st, notes], i) => { rank[`POLICE:${c}`] = randomUUID(); ranksData.push({ id: rank[`POLICE:${c}`], institutionId: inst.POLICE.id, code: c, name: n, abbreviation: a, category: cat, seniorityOrder: i + 1, verificationStatus: st, sourceRef: REF.RANK_SOURCES.POLICE, notes }); });
  REF.PRISON_RANKS.forEach(([c, n, a, cat, st], i) => { rank[`PRISONS:${c}`] = randomUUID(); ranksData.push({ id: rank[`PRISONS:${c}`], institutionId: inst.PRISONS.id, code: c, name: n, abbreviation: a, category: cat, seniorityOrder: i + 1, verificationStatus: st, sourceRef: REF.RANK_SOURCES.PRISONS }); });
  await prisma.rank.createMany({ data: ranksData });

  // ── organizational units & facilities ──
  type Unit = { id: string; path: string; code: string; name: string };
  const units: Prisma.OrganizationalUnitCreateManyInput[] = [];
  const mkUnit = (code: 'POLICE' | 'PRISONS', type: string, ucode: string, uname: string, parent: Unit | null, real: boolean, src?: string): Unit => {
    const id = randomUUID(); const path = `${parent ? parent.path : '/'}${id}/`;
    units.push({ id, institutionId: inst[code].id, typeId: unitType[`${code}:${type}`], parentId: parent?.id ?? null, code: ucode, name: uname, path, isSynthetic: !real, verificationStatus: real ? 'VERIFIED' : 'UNCONFIRMED', sourceRef: src ?? (real ? 'docs/research/04-organisational-hierarchy.md' : 'Synthetic demo unit') });
    return { id, path, code: ucode, name: uname };
  };
  const facilities: Prisma.FacilityCreateManyInput[] = []; const housing: Prisma.HousingUnitCreateManyInput[] = [];
  const policeHQ = mkUnit('POLICE', 'NATIONAL_HQ', 'GPS-HQ', 'National Police Headquarters', null, true);
  const cid = mkUnit('POLICE', 'DIRECTORATE', 'GPS-CID', 'Criminal Investigation Department', policeHQ, true);
  const policeHR = mkUnit('POLICE', 'DIRECTORATE', 'GPS-HR', 'Human Resource Directorate (demo label)', policeHQ, false);
  const policeRegions: Unit[] = []; const stations: Array<{ unit: Unit; facilityId: string; region: Unit; district: Unit }> = [];
  const demoPoliceRegions: Array<[string, string]> = [['Accra', 'Greater Accra'], ['Ashanti', 'Ashanti'], ['Northern', 'Northern']];
  for (const rc of REF.POLICE_REGIONAL_COMMANDS) {
    const short = rc.toUpperCase().replace(/ /g, '-');
    const ru = mkUnit('POLICE', 'REGIONAL_COMMAND', `GPS-R-${short}`, `${rc} Regional Police Command`, policeHQ, true, 'police.gov.gh navigation (25 regional commands) — currency to be confirmed');
    const demo = demoPoliceRegions.find(([n]) => n === rc); if (!demo) continue;
    policeRegions.push(ru);
    const div = mkUnit('POLICE', 'DIVISION', `GPS-D-${short}-1`, `DEMO ${rc} Division 1`, ru, false);
    for (let d = 1; d <= 2; d++) {
      const dist = mkUnit('POLICE', 'DISTRICT', `GPS-DT-${short}-${d}`, `DEMO ${rc} District ${d}`, div, false);
      for (let st = 1; st <= 2; st++) {
        const n = (d - 1) * 2 + st; const su = mkUnit('POLICE', 'STATION', `GPS-ST-${short}-${n}`, `DEMO ${rc} Station ${n}`, dist, false);
        const fid = randomUUID();
        facilities.push({ id: fid, institutionId: inst.POLICE.id, orgUnitId: su.id, facilityTypeId: facType['POLICE:STATION'], regionId: regions.get(demo[1])!, code: `PS-${short}-${n}`, name: su.name, town: `DEMO town`, capacity: int(12, 30), functions: ['CHARGE_OFFICE', 'CELLS'], isSynthetic: true });
        stations.push({ unit: su, facilityId: fid, region: ru, district: dist });
      }
    }
  }
  const prisonsHQ = mkUnit('PRISONS', 'NATIONAL_HQ', 'GPRS-HQ', 'Prisons Service Headquarters', null, true);
  const prisonsHR = mkUnit('PRISONS', 'DIRECTORATE', 'GPRS-HR', 'Human Resource Directorate (demo label)', prisonsHQ, false);
  const prisons: Array<{ unit: Unit; facilityId: string; region: Unit; housing: string[]; capacity: number }> = []; const prisonRegions: Unit[] = [];
  const prisonTypes: Array<[string, string[]]> = [['CENTRAL', ['REMAND', 'CONVICTED']], ['LOCAL', ['REMAND', 'CONVICTED']]];
  for (const rc of REF.PRISON_REGIONAL_COMMANDS_DEMO) {
    const short = rc.toUpperCase(); const ru = mkUnit('PRISONS', 'REGIONAL_COMMAND', `GPRS-R-${short}`, `${rc} Regional Prisons Command`, prisonsHQ, true, 'ghanaprisons.gov.gh regional command pages');
    prisonRegions.push(ru);
    prisonTypes.forEach(([t, fn], i) => {
      const pu = mkUnit('PRISONS', 'ESTABLISHMENT', `GPRS-E-${short}-${i + 1}`, `DEMO ${rc} ${t === 'CENTRAL' ? 'Central' : 'Local'} Prison`, ru, false);
      const fid = randomUUID(); const capacity = t === 'CENTRAL' ? 60 : 30; const hs: string[] = [];
      facilities.push({ id: fid, institutionId: inst.PRISONS.id, orgUnitId: pu.id, facilityTypeId: facType[`PRISONS:${t}`], regionId: regions.get(rc)!, code: `PR-${short}-${i + 1}`, name: pu.name, town: 'DEMO town', capacity, functions: fn, isSynthetic: true });
      ['A', 'B', 'C'].forEach((b) => { const hid = randomUUID(); hs.push(hid); housing.push({ id: hid, facilityId: fid, code: `BLK-${b}`, name: `Block ${b}`, capacity: capacity / 3 }); });
      prisons.push({ unit: pu, facilityId: fid, region: ru, housing: hs, capacity });
    });
  }
  await prisma.organizationalUnit.createMany({ data: units });
  await prisma.facility.createMany({ data: facilities });
  await prisma.housingUnit.createMany({ data: housing });

  // ── roles, permissions, demo users ──
  const permId: Record<string, string> = {};
  for (const [code, description] of Object.entries(PERMISSIONS)) permId[code] = (await prisma.permission.create({ data: { code, description } })).id;
  const roleId: Record<string, string> = {};
  for (const r of ROLES) {
    roleId[r.code] = (await prisma.role.create({ data: { code: r.code, name: r.name, institutionId: r.institution ? inst[r.institution].id : null, scopeLevel: r.scopeLevel, workspace: r.workspace, permissions: { create: r.permissions.map((p) => ({ permissionId: permId[p] })) } } })).id;
  }
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const accraStation = stations[0]; const kumasiStation = stations[4]; const ashPrison = prisons[0]; const northPrison = prisons[2];
  const demoUsers: Array<[email: string, name: string, role: string, unit: Unit | null]> = [
    ['admin@nexcust.demo', 'Demo Platform Administrator', 'PLATFORM_ADMIN', null],
    ['police.national@nexcust.demo', 'Demo Police National Administrator', 'POLICE_NATIONAL_ADMIN', policeHQ],
    ['police.regional@nexcust.demo', 'Demo Regional Commander (Accra)', 'POLICE_REGIONAL_COMMANDER', accraStation.region],
    ['police.station@nexcust.demo', `Demo Station Commander (${accraStation.unit.name})`, 'POLICE_STATION_COMMANDER', accraStation.unit],
    ['police.records@nexcust.demo', `Demo Records Officer (${accraStation.unit.name})`, 'POLICE_RECORDS_OFFICER', accraStation.unit],
    ['police.records.kumasi@nexcust.demo', `Demo Records Officer (${kumasiStation.unit.name})`, 'POLICE_RECORDS_OFFICER', kumasiStation.unit],
    ['police.hr@nexcust.demo', 'Demo Police HR Officer', 'POLICE_HR_OFFICER', policeHQ],
    ['police.bgcheck@nexcust.demo', 'Demo Background Check Officer', 'BACKGROUND_CHECK_OFFICER', policeHQ],
    ['prisons.national@nexcust.demo', 'Demo Prisons National Administrator', 'PRISONS_NATIONAL_ADMIN', prisonsHQ],
    ['prisons.superintendent@nexcust.demo', `Demo Officer-in-Charge (${ashPrison.unit.name})`, 'PRISON_SUPERINTENDENT', ashPrison.unit],
    ['prisons.records@nexcust.demo', `Demo Records Officer (${ashPrison.unit.name})`, 'PRISON_RECORDS_OFFICER', ashPrison.unit],
    ['prisons.records.north@nexcust.demo', `Demo Records Officer (${northPrison.unit.name})`, 'PRISON_RECORDS_OFFICER', northPrison.unit],
    ['prisons.hr@nexcust.demo', 'Demo Prison HR Officer', 'PRISON_HR_OFFICER', prisonsHQ],
    ['auditor@nexcust.demo', 'Demo Auditor', 'AUDITOR', null],
    ['applicant@nexcust.demo', 'Demo Public Applicant', 'PUBLIC_APPLICANT', null],
  ];
  const userId: Record<string, string> = {};
  for (const [email, displayName, role, unit] of demoUsers) {
    userId[email] = (await prisma.user.create({ data: { email, displayName, passwordHash, roleAssignments: { create: { roleId: roleId[role], orgUnitId: unit?.id ?? null } } } })).id;
  }
  const polRec = userId['police.records@nexcust.demo']; const polCmd = userId['police.station@nexcust.demo'];
  const priRec = userId['prisons.records@nexcust.demo']; const priSup = userId['prisons.superintendent@nexcust.demo'];

  // ── National Person Index: 1,000 synthetic people ──
  const persons: Prisma.PersonCreateManyInput[] = []; const idents: Prisma.PersonIdentifierCreateManyInput[] = [];
  for (let i = 1; i <= 1000; i++) {
    const n = name(); const id = randomUUID();
    persons.push({ id, indexNumber: `DEMO-NPI-${pad(i, 6)}`, ...n, dateOfBirth: dateOnly(daysAgo(int(18 * 365, 65 * 365))), nationality: 'Ghanaian', hometown: pick(TOWNS), isSynthetic: true });
    if (chance(0.8)) idents.push({ personId: id, type: 'GHANA_CARD', value: `DEMO-GHA-${pad(i, 9)}-${int(0, 9)}`, verified: chance(0.7) });
  }
  await prisma.person.createMany({ data: persons }); await prisma.personIdentifier.createMany({ data: idents });

  // ── Personnel: 200 police, 100 prisons (rank ≠ appointment ≠ posting) ──
  const personnel = async (code: 'POLICE' | 'PRISONS', count: number, postUnits: Unit[], hqUnits: Unit[], rankPool: string[]) => {
    const rows: any[] = []; const postings: any[] = []; const ranksH: any[] = [];
    for (let i = 1; i <= count; i++) {
      const id = randomUUID(); const n = name(); const unit = i <= hqUnits.length * 3 ? hqUnits[(i - 1) % hqUnits.length] : postUnits[(i - 1) % postUnits.length];
      const rIdx = Math.min(rankPool.length - 1, Math.floor(Math.pow(rnd(), 0.55) * rankPool.length)); const rk = rank[`${code}:${rankPool[rIdx]}`];
      const enlist = daysAgo(int(400, 25 * 365)); const prevUnit = pick(postUnits);
      rows.push({ id, serviceNumber: `DEMO-${code === 'POLICE' ? 'GPS' : 'GPRS'}-${pad(i, 5)}`, ...n, dateOfBirth: dateOnly(daysAgo(int(23 * 365, 58 * 365))), enlistmentDate: dateOnly(enlist), currentRankId: rk, currentOrgUnitId: unit.id, isSynthetic: true });
      const moved = daysAgo(int(30, 380));
      if (prevUnit.id !== unit.id) postings.push({ personnelId: id, toOrgUnitId: prevUnit.id, status: 'ENDED', effectiveFrom: enlist, effectiveTo: moved, reason: 'Initial posting' });
      postings.push({ personnelId: id, fromOrgUnitId: prevUnit.id !== unit.id ? prevUnit.id : null, toOrgUnitId: unit.id, status: 'CONFIRMED', effectiveFrom: prevUnit.id !== unit.id ? moved : enlist, reason: 'Service requirement' });
      ranksH.push({ personnelId: id, rankId: rk, effectiveFrom: dateOnly(daysAgo(int(60, 399))), authorityRef: 'DEMO authority reference' });
    }
    return { rows, postings, ranksH };
  };
  const pol = await personnel('POLICE', 200, stations.map((x) => x.unit), [policeHQ, cid, policeHR], ['ACP', 'CSUPT', 'SUPT', 'DSP', 'ASP', 'CINSP', 'INSP', 'SGT', 'CPL', 'LCPL', 'CONST']);
  await prisma.policePersonnel.createMany({ data: pol.rows }); await prisma.policePosting.createMany({ data: pol.postings }); await prisma.policeRankHistory.createMany({ data: pol.ranksH });
  const pri = await personnel('PRISONS', 100, prisons.map((x) => x.unit), [prisonsHQ, prisonsHR], ['ADP', 'CSUPT', 'SUPT', 'DSP', 'ASP', 'SCO', 'CO', 'ACO', 'SGT', 'CPL', 'LCPL', '2CO']);
  await prisma.prisonPersonnel.createMany({ data: pri.rows }); await prisma.prisonPosting.createMany({ data: pri.postings }); await prisma.prisonRankHistory.createMany({ data: pri.ranksH });
  // command appointments (held by a person, at a unit — independent of rank)
  const byUnit = (rows: any[], unitId: string) => rows.find((r) => r.currentOrgUnitId === unitId);
  await prisma.policeCommandAssignment.createMany({ data: stations.map((st) => byUnit(pol.rows, st.unit.id)).filter(Boolean).map((p: any) => ({ personnelId: p.id, appointmentId: appt['POLICE:STATION_OFFICER'], orgUnitId: p.currentOrgUnitId, effectiveFrom: dateOnly(daysAgo(200)), authorityRef: 'DEMO' })) });
  await prisma.prisonCommandAssignment.createMany({ data: prisons.map((pr) => byUnit(pri.rows, pr.unit.id)).filter(Boolean).map((p: any) => ({ personnelId: p.id, appointmentId: appt['PRISONS:OFFICER_IN_CHARGE'], orgUnitId: p.currentOrgUnitId, effectiveFrom: dateOnly(daysAgo(300)), authorityRef: 'DEMO' })) });

  // ── Police operations ──
  const incidents: any[] = [], cases: any[] = [], casePersons: any[] = [], arrests: any[] = [], charges: any[] = [], convictions: any[] = [], custody: any[] = [], movements: any[] = [];
  const inPoliceCustody = new Set<string>(); const convictedPersons: string[] = [];
  for (let i = 1; i <= 160; i++) {
    const st = stations[(i - 1) % stations.length]; const person = persons[i - 1]; const offence = pick(OFFENCES);
    const age = i <= 30 ? int(2, 70) : int(96, 24 * 400); // first 30 are recent → open custody
    const at = hoursAgo(age); const incId = randomUUID(), caseId = randomUUID(), arrId = randomUUID();
    incidents.push({ id: incId, reference: `DEMO-INC-${pad(i, 5)}`, facilityId: st.facilityId, reportedAt: hoursAgo(age + int(1, 48)), category: offence, summary: `Synthetic demonstration incident: ${offence.toLowerCase()} reported.`, location: 'DEMO location', status: 'CASE_OPENED', recordedById: polRec });
    const convicted = i > 60 && chance(0.35); const closed = convicted || (i > 60 && chance(0.3));
    cases.push({ id: caseId, caseNumber: `DEMO-CASE-${pad(i, 5)}`, facilityId: st.facilityId, incidentId: incId, title: `${offence} — synthetic case ${i}`, offenceCategory: offence, status: closed ? 'CLOSED' : i <= 30 ? 'UNDER_INVESTIGATION' : pick(['UNDER_INVESTIGATION', 'BEFORE_COURT', 'FORWARDED_FOR_ADVICE']), openedAt: at, closedAt: closed ? hoursAgo(age / 2) : null });
    casePersons.push({ caseId, personId: person.id, role: 'SUSPECT' }, { caseId, personId: persons[999 - i].id, role: 'COMPLAINANT' });
    arrests.push({ id: arrId, reference: `DEMO-ARR-${pad(i, 5)}`, personId: person.id, facilityId: st.facilityId, caseId, arrestedAt: at, location: 'DEMO location', suspectedOffence: offence, legalAuthority: 'Arrest without warrant on reasonable suspicion (demo text)', recordedById: polRec,
      arrestBasis: 'WITHOUT_WARRANT_S10', reasonsGivenAt: new Date(at.getTime() + 10 * 60_000), rightToLawyerGivenAt: new Date(at.getTime() + 10 * 60_000), languageUsed: pick(['English', 'Twi', 'Ga', 'Ewe', 'Dagbani']) });
    const chargeId = randomUUID();
    if (i > 30) charges.push({ id: chargeId, caseId, arrestId: arrId, personId: person.id!, offence, statuteRef: 'DEMO statute reference', status: convicted ? 'CONVICTED' : closed ? pick(['WITHDRAWN', 'DISMISSED', 'ACQUITTED']) : 'FILED', filedAt: hoursAgo(age - 40) });
    if (convicted) { convictions.push({ personId: person.id!, caseId, chargeId, court: pick(COURTS), courtCaseRef: `DEMO-CT-${pad(i, 5)}`, offence, convictedAt: dateOnly(hoursAgo(age / 2)), sentenceSummary: `${int(3, 48)} months imprisonment (synthetic)`, recordedById: polRec }); convictedPersons.push(person.id!); }
    const epId = randomUUID(); const open = i <= 30;
    if (open) inPoliceCustody.add(person.id!);
    custody.push({ id: epId, reference: `DEMO-CUS-${pad(i, 5)}`, personId: person.id, arrestId: arrId, facilityId: st.facilityId, status: open ? 'IN_CUSTODY' : pick(['RELEASED_ON_BAIL', 'TRANSFERRED_TO_COURT', 'REMANDED_TO_PRISON', 'RELEASED_NO_CHARGE']), detainedAt: at, courtDeadlineAt: new Date(at.getTime() + 48 * 3600_000), legalAuthority: 'Demo legal authority text', cellRef: `Cell ${int(1, 4)}`, openedById: polRec, closedAt: open ? null : new Date(at.getTime() + int(4, 46) * 3600_000), closedById: open ? null : polRec, dispositionAuthorizedById: open ? null : polCmd, dispositionNote: open ? null : 'Synthetic disposition' });
    movements.push({ episodeId: epId, type: 'CELL_ASSIGNMENT', toFacilityId: st.facilityId, occurredAt: at, note: 'Placed in cells', recordedById: polRec });
  }
  await prisma.policeIncident.createMany({ data: incidents }); await prisma.policeCase.createMany({ data: cases }); await prisma.casePerson.createMany({ data: casePersons });
  await prisma.arrest.createMany({ data: arrests }); await prisma.charge.createMany({ data: charges }); await prisma.convictionRecord.createMany({ data: convictions });
  await prisma.policeCustodyEpisode.createMany({ data: custody }); await prisma.custodyMovement.createMany({ data: movements });

  // ── Prisons operations ──
  const orders: any[] = [], prisoners: any[] = [], admissions: any[] = [], episodes: any[] = [], sentences: any[] = [], transfers: any[] = [], releases: any[] = [], pIncidents: any[] = [], programmes: any[] = [], enrollments: any[] = [];
  const progByFacility = new Map<string, string[]>();
  for (const pr of prisons) for (const [n, c] of [['Tailoring workshop', 'VOCATIONAL'], ['Adult literacy', 'EDUCATION'], ['Carpentry', 'VOCATIONAL']] as const) { const id = randomUUID(); programmes.push({ id, facilityId: pr.facilityId, name: `DEMO ${n}`, category: c, capacity: 20 }); progByFacility.set(pr.facilityId, [...(progByFacility.get(pr.facilityId) ?? []), id]); }
  for (let i = 1; i <= 200; i++) {
    const person = persons[300 + i]; const pr = prisons[(i - 1) % prisons.length]; const convicted = chance(0.6); const days = int(5, 900); const at = daysAgo(days);
    const recId = randomUUID(), ordId = randomUUID(), admId = randomUUID(), epId = randomUUID();
    prisoners.push({ id: recId, prisonerNumber: `DEMO-PN-${pad(i, 6)}`, personId: person.id });
    orders.push({ id: ordId, personId: person.id, type: convicted ? 'COMMITMENT_TO_UNDERGO_SENTENCE' : 'REMAND_COMMITMENT_FOR_TRIAL', formNumber: convicted ? 'Form 21' : 'Form 14', court: pick(COURTS), orderRef: `DEMO-WRT-${pad(i, 6)}`, issuedAt: dateOnly(at), returnDate: convicted ? null : dateOnly(daysAgo(days - 14)), verifiedById: priRec, verifiedAt: at });
    // Remand prisoners held beyond their first court date have a renewed remand warrant; a few are left expired for follow-up (CHRAJ reports this is common).
    if (!convicted && days > 14 && i <= 150 && i % 9 !== 0) { const issued = daysAgo(int(1, 12)); orders.push({ personId: person.id, type: 'REMAND_COMMITMENT_FOR_TRIAL', formNumber: 'Form 14', court: pick(COURTS), orderRef: `DEMO-WRT-${pad(i, 6)}-R`, issuedAt: dateOnly(issued), returnDate: dateOnly(new Date(issued.getTime() + 14 * 86400_000)), verifiedById: priRec, verifiedAt: issued }); }
    admissions.push({ id: admId, reference: `DEMO-ADM-${pad(i, 6)}`, prisonerRecordId: recId, facilityId: pr.facilityId, courtOrderId: ordId, classification: convicted ? 'CONVICTED' : 'REMAND', admittedAt: at, identityCheckedById: priRec, recordedById: priRec,
      escortingOfficer: 'DEMO police escort', conditionAtHandover: 'Sober, no visible injuries (demo)', medicalScreenedAt: at, screenedByRole: 'MEDICAL_OFFICER', fitForAdmission: true });
    const released = i > 150; const transferred = !released && i % 12 === 0; const dest = prisons[i % prisons.length === (i - 1) % prisons.length ? 0 : i % prisons.length];
    episodes.push({ id: epId, prisonerRecordId: recId, admissionId: admId, facilityId: transferred ? dest.facilityId : pr.facilityId, housingUnitId: pick(transferred ? dest.housing : pr.housing), classification: convicted ? 'CONVICTED' : 'REMAND', status: released ? 'RELEASED' : 'IN_CUSTODY', startedAt: at, endedAt: released ? daysAgo(int(1, 4)) : null });
    if (convicted) { const term = int(6, 60); sentences.push({ prisonerRecordId: recId, courtOrderId: ordId, offence: pick(OFFENCES), sentenceText: `${term} months imprisonment (synthetic)`, termMonths: term, sentencedAt: dateOnly(at), sentenceStartDate: dateOnly(at), latestReleaseDate: dateOnly(new Date(at.getTime() + term * 30.4 * 86400_000)), recordedById: priRec }); }
    if (transferred) transfers.push({ reference: `DEMO-TRF-${pad(i, 6)}`, episodeId: epId, fromFacilityId: pr.facilityId, toFacilityId: dest.facilityId, reason: 'Decongestion (synthetic)', status: 'RECEIVED', initiatedById: priRec, approvedById: priSup, approvedAt: daysAgo(3), dispatchedAt: daysAgo(3), receivedById: priRec, receivedAt: daysAgo(2) });
    if (released) releases.push({ reference: `DEMO-REL-${pad(i, 6)}`, episodeId: epId, facilityId: pr.facilityId, type: convicted ? 'END_OF_SENTENCE_WITH_REMISSION' : 'RELEASE_ON_BAIL_ORDER', legalAuthority: convicted ? 'Sentence served per warrant of commitment (demo)' : 'Order of release on bail, s.98 (demo)', status: 'COMPLETED', initiatedById: priRec, approvedById: priSup, approvedAt: daysAgo(5), releasedAt: daysAgo(int(1, 4)), warrantReturnedAt: daysAgo(1) });
    if (!released && chance(0.3)) enrollments.push({ programmeId: pick(progByFacility.get(transferred ? dest.facilityId : pr.facilityId)!), prisonerRecordId: recId });
  }
  for (let i = 1; i <= 24; i++) pIncidents.push({ reference: `DEMO-PIN-${pad(i, 5)}`, facilityId: prisons[i % prisons.length].facilityId, occurredAt: daysAgo(int(1, 200)), category: pick(['Contraband', 'Medical', 'Altercation', 'Property']), summary: 'Synthetic operational incident.', severity: pick(['LOW', 'LOW', 'MEDIUM', 'HIGH']), recordedById: priRec });
  await prisma.prisonerRecord.createMany({ data: prisoners }); await prisma.courtOrder.createMany({ data: orders }); await prisma.prisonAdmission.createMany({ data: admissions });
  await prisma.prisonCustodyEpisode.createMany({ data: episodes }); await prisma.sentenceRecord.createMany({ data: sentences }); await prisma.prisonTransfer.createMany({ data: transfers });
  await prisma.prisonRelease.createMany({ data: releases }); await prisma.prisonIncident.createMany({ data: pIncidents });
  await prisma.rehabilitationProgramme.createMany({ data: programmes }); await prisma.rehabilitationEnrollment.createMany({ data: enrollments });

  // ── Background-check applications (internal case-processing demo; not a replacement for the official e-service) ──
  const applicant = userId['applicant@nexcust.demo'];
  const statuses = ['SUBMITTED', 'SUBMITTED', 'PAYMENT_CONFIRMED', 'APPOINTMENT_BOOKED', 'BIOMETRICS_CAPTURED', 'RECORDS_SEARCHED', 'UNDER_REVIEW', 'UNDER_REVIEW', 'REJECTED', 'SUBMITTED'] as const;
  await prisma.backgroundCheckApplication.createMany({ data: statuses.map((status, i) => { const p = persons[700 + i]; return { reference: `DEMO-BGC-${pad(i + 1, 5)}`, applicantUserId: applicant, personId: status === 'SUBMITTED' ? null : p.id!, fullName: `${p.otherNames} ${p.surname}`, dateOfBirth: p.dateOfBirth as Date, identifierType: 'GHANA_CARD' as const, identifierValue: `DEMO-GHA-${pad(701 + i, 9)}-0`, purpose: pick(['Employment', 'Travel / visa', 'Education']), status, submittedAt: daysAgo(10 - i), residenceAttested: true,
    criminalIdent: ['RECORDS_SEARCHED', 'UNDER_REVIEW', 'REJECTED'].includes(status) ? 'NOT_IDENT' as const : null }; }) });

  await syncClearanceReference();
  await prisma.auditEvent.create({ data: { action: 'system.seed', outcome: 'SUCCESS', detail: { persons: 1000, policePersonnel: 200, prisonPersonnel: 100 } } });
  console.log(`Done. ${units.length} org units, ${facilities.length} facilities, 1000 persons, 200+100 personnel, ${custody.length} police custody episodes, ${episodes.length} prison episodes.`);
  console.log(`Demo accounts (password: ${DEMO_PASSWORD}):`); demoUsers.forEach(([e, , r]) => console.log(`  ${e.padEnd(40)} ${r}`));
}
const ranksData: Prisma.RankCreateManyInput[] = [];

/** Clearance service catalogue and signatory register (idempotent; runs on every deploy). */
async function syncClearanceReference() {
  for (const [i, t] of REF.CLEARANCE_SERVICE_TYPES.entries()) {
    const data = { name: t.name, vettingFeeGhs: t.vettingFeeGhs, addOnFeeGhs: t.addOnFeeGhs, available: t.available, requiresFingerprints: t.requiresFingerprints, sortOrder: i,
      verificationStatus: t.status, sourceRef: `${REF.CLEARANCE_SOURCE}${t.note ? ` — ${t.note}` : ''}` };
    await prisma.clearanceServiceType.upsert({ where: { code: t.code }, update: data, create: { code: t.code, ...data } });
  }
  const signer = await prisma.user.findUnique({ where: { email: REF.CLEARANCE_SIGNATORY.email } });
  if (signer) await prisma.authorisedSignatory.upsert({ where: { userId: signer.id }, update: { signatoryTitle: REF.CLEARANCE_SIGNATORY.signatoryTitle, signsFor: REF.CLEARANCE_SIGNATORY.signsFor },
    create: { userId: signer.id, signatoryTitle: REF.CLEARANCE_SIGNATORY.signatoryTitle, signsFor: REF.CLEARANCE_SIGNATORY.signsFor } });
  const ordinary = await prisma.clearanceServiceType.findUniqueOrThrow({ where: { code: 'ORDINARY_RESIDENT' } });
  await prisma.backgroundCheckApplication.updateMany({ where: { serviceTypeId: null }, data: { serviceTypeId: ordinary.id, residenceAttested: true } });
}

/** Bring permissions and role→permission mappings in line with the contracts package (idempotent). */
async function syncRbac() {
  for (const [code, description] of Object.entries(PERMISSIONS)) await prisma.permission.upsert({ where: { code }, update: { description }, create: { code, description } });
  const perms = new Map((await prisma.permission.findMany()).map((p) => [p.code, p.id]));
  for (const r of ROLES) {
    const role = await prisma.role.findUnique({ where: { code: r.code } });
    if (!role) continue;
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({ data: r.permissions.map((p) => ({ roleId: role.id, permissionId: perms.get(p)! })) }),
    ]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
