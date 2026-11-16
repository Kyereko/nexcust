/* eslint-disable no-console */
/**
 * NEXCUST seed.
 *  - Institutional reference data is evidence-tagged: ranks, appointments and unit types from reference/ghana-reference.ts;
 *    every police unit and prison establishment from the research register (reference/facilities.ts,
 *    docs/research/15-facilities-register.md), each with its status (VERIFIED / PROVISIONAL) and source.
 *  - Everything operational (people, officers, cases, custody, prisoners) is SYNTHETIC: generated from a fixed PRNG and
 *    flagged isSynthetic. References carry the NX- prefix and identity numbers a letter (GHA-NX…) so that no generated
 *    number can coincide with a real Ghana Card, service or prisoner number.
 *  - Seeded sign-in accounts are role accounts named by role and post, never after a person.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PERMISSIONS, ROLES } from '@nexcust/contracts';
import { hashPassword } from '../src/password';
import * as REF from '../reference/ghana-reference';
import { POLICE_UNITS, PRISON_ESTABLISHMENTS, PRISON_TYPE, REGISTER_REF, displayName, policeUnitName, slug } from '../reference/facilities';

const prisma = new PrismaClient();
const SEED_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';
export const ACCOUNT_DOMAIN = 'nexcust.fourthit.com';
const acct = (local: string) => `${local}@${ACCOUNT_DOMAIN}`;

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
const inBatches = async <T>(rows: T[], write: (part: T[]) => Promise<unknown>, size = 1000) => { for (let i = 0; i < rows.length; i += size) await write(rows.slice(i, i + size)); };

const SURNAMES = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Appiah', 'Agyeman', 'Amoah', 'Adjei', 'Tetteh', 'Lamptey', 'Quaye', 'Nartey', 'Addo', 'Ofori', 'Darko', 'Acheampong', 'Antwi', 'Gyamfi', 'Yeboah', 'Abubakari', 'Mahama', 'Alhassan', 'Issah', 'Fuseini', 'Agbeko', 'Dzidzornu', 'Kpodo', 'Amegashie', 'Awuni', 'Atinga', 'Bawa', 'Danso', 'Frimpong', 'Sarpong', 'Opoku', 'Bonsu', 'Ansah', 'Essien', 'Quansah'];
const MALE = ['Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kwabena', 'Kwesi', 'Kojo', 'Ebo', 'Fiifi', 'Nii', 'Selorm', 'Elikem', 'Abdul', 'Ibrahim', 'Mohammed', 'Emmanuel', 'Samuel', 'Daniel', 'Isaac', 'Joseph', 'Bright', 'Prince', 'Richmond', 'Clement'];
const FEMALE = ['Ama', 'Akosua', 'Abena', 'Adwoa', 'Yaa', 'Afia', 'Esi', 'Efua', 'Araba', 'Naa', 'Dzifa', 'Mawusi', 'Fatima', 'Amina', 'Hawa', 'Grace', 'Mercy', 'Comfort', 'Patience', 'Gifty', 'Linda', 'Priscilla', 'Rita', 'Vida'];
const TOWNS = ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Ho', 'Koforidua', 'Sunyani', 'Bolgatanga', 'Wa', 'Tema', 'Obuasi', 'Techiman', 'Nkawkaw', 'Winneba'];
const OFFENCES = ['Stealing', 'Assault', 'Causing unlawful damage', 'Defrauding by false pretences', 'Unlawful entry', 'Robbery', 'Threat of harm', 'Dishonestly receiving', 'Careless driving', 'Possession of narcotic drugs'];
/** The enactment each offence is charged under (Act name only; sections are left to the charging officer). */
const STATUTE: Record<string, string> = { 'Careless driving': 'Road Traffic Act, 2004 (Act 683)', 'Possession of narcotic drugs': 'Narcotics Control Commission Act, 2020 (Act 1019)' };
const statuteOf = (offence: string) => STATUTE[offence] ?? 'Criminal Offences Act, 1960 (Act 29)';
const COURTS = ['Circuit Court, Accra', 'District Court, Accra', 'High Court (Criminal Division), Accra', 'Circuit Court, Kumasi', 'District Court, Kumasi', 'Circuit Court, Tamale', 'District Court, Cape Coast', 'Circuit Court, Ho'];

function name(sex?: 'MALE' | 'FEMALE') {
  const female = sex ? sex === 'FEMALE' : chance(0.3);
  return { sex: female ? 'FEMALE' as const : 'MALE' as const, surname: pick(SURNAMES), otherNames: `${pick(female ? FEMALE : MALE)}${chance(0.4) ? ' ' + pick(female ? FEMALE : MALE) : ''}` };
}
/** Identity numbers shaped like Ghana Card numbers but containing letters, so they can never match a real card. */
const syntheticCard = (n: number) => `GHA-NX${pad(n, 7)}-${int(0, 9)}`;

async function main() {
  if (await prisma.institution.count()) {
    await syncRbac();
    await syncClearanceReference();
    console.log('Database already seeded — roles and permissions synchronised with @nexcust/contracts (use `pnpm db:reset` to rebuild data).');
    return;
  }
  console.log('Seeding NEXCUST: reference data and the facilities register, then synthetic operational records…');
  // ── institutions & reference data ──
  const inst = {
    POLICE: await prisma.institution.create({ data: { code: 'POLICE', name: 'Ghana Police Service' } }),
    PRISONS: await prisma.institution.create({ data: { code: 'PRISONS', name: 'Ghana Prisons Service' } }),
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

  // ── organizational units & facilities: the research register ──
  type Status = 'VERIFIED' | 'PROVISIONAL' | 'UNCONFIRMED';
  type Unit = { id: string; path: string; code: string; name: string };
  const units: Prisma.OrganizationalUnitCreateManyInput[] = [];
  const mkUnit = (code: 'POLICE' | 'PRISONS', type: string, ucode: string, uname: string, parent: Unit | null, status: Status, src: string): Unit => {
    const id = randomUUID(); const path = `${parent ? parent.path : '/'}${id}/`;
    units.push({ id, institutionId: inst[code].id, typeId: unitType[`${code}:${type}`], parentId: parent?.id ?? null, code: ucode, name: uname, path, isSynthetic: false, verificationStatus: status, sourceRef: src });
    return { id, path, code: ucode, name: uname };
  };
  const facilities: Prisma.FacilityCreateManyInput[] = []; const housing: Prisma.HousingUnitCreateManyInput[] = [];
  const point = (r: { lat: number | null; lng: number | null; coordPrecision: string | null }) => (r.lat == null || r.lng == null ? {} : { latitude: r.lat, longitude: r.lng, coordPrecision: r.coordPrecision });

  // Police: National HQ ⊃ 25 regional commands ⊃ divisions ⊃ districts ⊃ stations and posts.
  const policeHQ = mkUnit('POLICE', 'NATIONAL_HQ', 'GPS-HQ', 'National Police Headquarters', null, 'VERIFIED', 'docs/research/04-organisational-hierarchy.md');
  const cid = mkUnit('POLICE', 'DIRECTORATE', 'GPS-CID', 'Criminal Investigation Department', policeHQ, 'VERIFIED', 'docs/research/04-organisational-hierarchy.md');
  const policeHR = mkUnit('POLICE', 'DIRECTORATE', 'GPS-HR', 'Human Resource Directorate', policeHQ, 'UNCONFIRMED', 'Directorate name to be confirmed with the Service (docs/research/04)');
  type Station = { unit: Unit; facilityId: string; command: Unit; rc: string; name: string; precise: boolean; status: Status };
  const commands = new Map<string, Unit>(), commandRegion = new Map<string, string>(), divisions = new Map<string, Unit>(), districts = new Map<string, Unit>();
  const stations: Station[] = []; const counter = new Map<string, number>();
  const next = (k: string) => { const n = (counter.get(k) ?? 0) + 1; counter.set(k, n); return n; };
  for (const r of POLICE_UNITS.filter((u) => u.kind === 'REGIONAL_COMMAND')) {
    commands.set(r.regionalCommand, mkUnit('POLICE', 'REGIONAL_COMMAND', `GPS-R-${slug(r.regionalCommand)}`, policeUnitName(r), policeHQ, r.status, r.source));
    commandRegion.set(r.regionalCommand, r.adminRegions[0]);
  }
  for (const r of POLICE_UNITS.filter((u) => u.kind === 'DIVISION')) {
    const k = `${r.regionalCommand}|${r.division}`; if (divisions.has(k)) continue;
    divisions.set(k, mkUnit('POLICE', 'DIVISION', `GPS-DV-${slug(r.regionalCommand)}-${next(`dv:${r.regionalCommand}`)}`, policeUnitName(r), commands.get(r.regionalCommand)!, r.status, r.source));
  }
  for (const r of POLICE_UNITS.filter((u) => u.kind === 'DISTRICT')) {
    const k = `${r.regionalCommand}|${r.division}|${r.district}`; if (districts.has(k)) continue;
    const parent = divisions.get(`${r.regionalCommand}|${r.division}`) ?? commands.get(r.regionalCommand)!;
    districts.set(k, mkUnit('POLICE', 'DISTRICT', `GPS-DT-${slug(r.regionalCommand)}-${next(`dt:${r.regionalCommand}`)}`, policeUnitName(r), parent, r.status, r.source));
  }
  for (const r of POLICE_UNITS.filter((u) => u.kind === 'STATION' || u.kind === 'POST')) {
    const command = commands.get(r.regionalCommand)!;
    const parent = districts.get(`${r.regionalCommand}|${r.division}|${r.district}`) ?? divisions.get(`${r.regionalCommand}|${r.division}`) ?? command;
    const n = next(`st:${r.regionalCommand}`); const uname = policeUnitName(r);
    const su = mkUnit('POLICE', 'STATION', `GPS-ST-${slug(r.regionalCommand)}-${n}`, uname, parent, r.status, r.note ? `${r.source} — ${r.note}` : r.source);
    const fid = randomUUID(); const region = r.adminRegions[0] ?? commandRegion.get(r.regionalCommand);
    facilities.push({ id: fid, institutionId: inst.POLICE.id, orgUnitId: su.id, facilityTypeId: facType[`POLICE:${r.kind === 'POST' ? 'POST' : 'STATION'}`], regionId: region ? regions.get(region) : null,
      code: `PS-${slug(r.regionalCommand)}-${n}`, name: uname, town: r.town ? displayName(r.town) : null, functions: r.kind === 'POST' ? ['CHARGE_OFFICE'] : ['CHARGE_OFFICE', 'CELLS'], isSynthetic: false, ...point(r) });
    stations.push({ unit: su, facilityId: fid, command, rc: r.regionalCommand, name: uname, precise: r.coordPrecision === 'STATION' || r.coordPrecision === 'OFFICIAL_MAP', status: r.status });
  }

  // Prisons: Headquarters ⊃ regional commands ⊃ the 46 custodial establishments (VERIFIED rows only).
  const hqRow = PRISON_ESTABLISHMENTS.find((p) => p.type.startsWith('headquarters'));
  const prisonsHQ = mkUnit('PRISONS', 'NATIONAL_HQ', 'GPRS-HQ', 'Prisons Service Headquarters', null, 'VERIFIED', hqRow?.source ?? REGISTER_REF);
  const prisonsHR = mkUnit('PRISONS', 'DIRECTORATE', 'GPRS-HR', 'Human Resource Directorate', prisonsHQ, 'UNCONFIRMED', 'Directorate name to be confirmed with the Service (docs/research/04)');
  type Prison = { unit: Unit; facilityId: string; command: Unit; name: string; housing: string[]; nominal: number; female: boolean; camp: boolean };
  const prisons: Prison[] = []; const prisonCommands = new Map<string, Unit>();
  const custodial = PRISON_ESTABLISHMENTS.filter((p) => p.status === 'VERIFIED' && PRISON_TYPE[p.type]);
  custodial.forEach((p, i) => {
    let command = prisonCommands.get(p.regionalCommand);
    if (!command) { command = mkUnit('PRISONS', 'REGIONAL_COMMAND', `GPRS-R-${slug(p.regionalCommand.replace(/ Regional Command$/, ''))}`, p.regionalCommand.replace(/Regional Command$/, 'Regional Prisons Command'), prisonsHQ, 'VERIFIED', p.source); prisonCommands.set(p.regionalCommand, command); }
    const type = PRISON_TYPE[p.type]; const female = type === 'FEMALE'; const camp = type === 'CAMP';
    const pu = mkUnit('PRISONS', 'ESTABLISHMENT', `GPRS-E-${pad(i + 1, 2)}`, p.name, command, p.status, p.note ? `${p.source} — ${p.note}` : p.source);
    const fid = randomUUID(); const nominal = p.capacity ?? 60; const blocks = nominal >= 400 ? 4 : nominal >= 100 ? 3 : 2; const hs: string[] = [];
    facilities.push({ id: fid, institutionId: inst.PRISONS.id, orgUnitId: pu.id, facilityTypeId: facType[`PRISONS:${type}`], regionId: p.adminRegion ? regions.get(p.adminRegion) : null, code: `PR-${slug(p.name)}`,
      name: p.name, town: p.town, capacity: p.capacity, functions: camp ? ['CONVICTED'] : female ? ['REMAND', 'CONVICTED', 'FEMALE'] : ['REMAND', 'CONVICTED'], isSynthetic: false, ...point(p) });
    for (let b = 0; b < blocks; b++) { const hid = randomUUID(); hs.push(hid); housing.push({ id: hid, facilityId: fid, code: `BLK-${'ABCD'[b]}`, name: `Block ${'ABCD'[b]}`, capacity: Math.max(1, Math.round(nominal / blocks)) }); }
    prisons.push({ unit: pu, facilityId: fid, command, name: p.name, housing: hs, nominal, female, camp });
  });
  await inBatches(units, (d) => prisma.organizationalUnit.createMany({ data: d }));
  await inBatches(facilities, (d) => prisma.facility.createMany({ data: d }));
  await prisma.housingUnit.createMany({ data: housing });

  // Stations that carry synthetic records: a spread across every regional command (precise map points first),
  // with the seeded accounts' stations heavier so their dashboards have work in them.
  const station = (n: string, rc: string) => stations.find((x) => x.name === n && x.rc === rc) ?? stations.find((x) => x.rc === rc)!;
  const accra = station('Nima Police Station', 'Accra'); const kumasi = station('Manhyia Police Station', 'Ashanti');
  const PER_COMMAND: Record<string, number> = { Accra: 8, Tema: 5, Ashanti: 6, 'Ashanti South': 4, 'Eastern South': 4, Central: 4 };
  const active: Station[] = [accra, kumasi];
  for (const rc of commands.keys()) {
    const pool = stations.filter((x) => x.rc === rc && x.status === 'VERIFIED' && x !== accra && x !== kumasi).sort((a, b) => Number(b.precise) - Number(a.precise));
    active.push(...pool.slice(0, PER_COMMAND[rc] ?? 3));
  }
  const prisonByName = (n: string) => prisons.find((p) => p.name === n)!;
  const ashPrison = prisonByName('Kumasi Central Prison'); const northPrison = prisonByName('Tamale Central Prison');

  // ── roles, permissions, seeded role accounts ──
  const permId: Record<string, string> = {};
  for (const [code, description] of Object.entries(PERMISSIONS)) permId[code] = (await prisma.permission.create({ data: { code, description } })).id;
  const roleId: Record<string, string> = {};
  for (const r of ROLES) {
    roleId[r.code] = (await prisma.role.create({ data: { code: r.code, name: r.name, institutionId: r.institution ? inst[r.institution].id : null, scopeLevel: r.scopeLevel, workspace: r.workspace, permissions: { create: r.permissions.map((p) => ({ permissionId: permId[p] })) } } })).id;
  }
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const accounts: Array<[email: string, name: string, role: string, unit: Unit | null]> = [
    [acct('admin'), 'Platform Administrator', 'PLATFORM_ADMIN', null],
    [acct('police.national'), 'Police National Administrator', 'POLICE_NATIONAL_ADMIN', policeHQ],
    [acct('police.regional'), `Regional Commander · ${accra.command.name}`, 'POLICE_REGIONAL_COMMANDER', accra.command],
    [acct('police.station'), `Station Commander · ${accra.name}`, 'POLICE_STATION_COMMANDER', accra.unit],
    [acct('police.records'), `Records Officer · ${accra.name}`, 'POLICE_RECORDS_OFFICER', accra.unit],
    [acct('police.records.kumasi'), `Records Officer · ${kumasi.name}`, 'POLICE_RECORDS_OFFICER', kumasi.unit],
    [acct('police.hr'), 'Police HR Officer', 'POLICE_HR_OFFICER', policeHQ],
    [acct('police.bgcheck'), 'Background Check Officer', 'BACKGROUND_CHECK_OFFICER', policeHQ],
    [acct('prisons.national'), 'Prisons National Administrator', 'PRISONS_NATIONAL_ADMIN', prisonsHQ],
    [acct('prisons.superintendent'), `Officer-in-Charge · ${ashPrison.name}`, 'PRISON_SUPERINTENDENT', ashPrison.unit],
    [acct('prisons.records'), `Records Officer · ${ashPrison.name}`, 'PRISON_RECORDS_OFFICER', ashPrison.unit],
    [acct('prisons.records.north'), `Records Officer · ${northPrison.name}`, 'PRISON_RECORDS_OFFICER', northPrison.unit],
    [acct('prisons.hr'), 'Prison HR Officer', 'PRISON_HR_OFFICER', prisonsHQ],
    [acct('auditor'), 'Auditor', 'AUDITOR', null],
    [acct('applicant'), 'Public Applicant', 'PUBLIC_APPLICANT', null],
  ];
  const userId: Record<string, string> = {};
  for (const [email, displayName, role, unit] of accounts) {
    userId[email] = (await prisma.user.create({ data: { email, displayName, passwordHash, roleAssignments: { create: { roleId: roleId[role], orgUnitId: unit?.id ?? null } } } })).id;
  }
  const polRec = userId[acct('police.records')]; const polCmd = userId[acct('police.station')];
  const priRec = userId[acct('prisons.records')]; const priSup = userId[acct('prisons.superintendent')];

  // ── National Person Index: synthetic people for police records and clearance applications ──
  const persons: Prisma.PersonCreateManyInput[] = []; const idents: Prisma.PersonIdentifierCreateManyInput[] = [];
  const newPerson = (sex?: 'MALE' | 'FEMALE') => {
    const n = name(sex); const id = randomUUID(); const k = persons.length + 1;
    persons.push({ id, indexNumber: `NX-NPI-${pad(k, 6)}`, ...n, dateOfBirth: dateOnly(daysAgo(int(18 * 365, 65 * 365))), nationality: 'Ghanaian', hometown: pick(TOWNS), isSynthetic: true });
    if (chance(0.8)) idents.push({ personId: id, type: 'GHANA_CARD', value: syntheticCard(k), verified: chance(0.7) });
    return persons[persons.length - 1];
  };
  for (let i = 0; i < 1200; i++) newPerson();
  await inBatches(persons, (d) => prisma.person.createMany({ data: d })); await inBatches(idents, (d) => prisma.personIdentifier.createMany({ data: d }));

  // ── Personnel: 400 police, 200 prisons (rank ≠ appointment ≠ posting) ──
  const personnel = async (code: 'POLICE' | 'PRISONS', count: number, postUnits: Unit[], hqUnits: Unit[], rankPool: string[]) => {
    const rows: any[] = []; const postings: any[] = []; const ranksH: any[] = [];
    for (let i = 1; i <= count; i++) {
      const id = randomUUID(); const n = name(); const unit = i <= hqUnits.length * 3 ? hqUnits[(i - 1) % hqUnits.length] : postUnits[(i - 1) % postUnits.length];
      const rIdx = Math.min(rankPool.length - 1, Math.floor(Math.pow(rnd(), 0.55) * rankPool.length)); const rk = rank[`${code}:${rankPool[rIdx]}`];
      const enlist = daysAgo(int(400, 25 * 365)); const prevUnit = pick(postUnits);
      rows.push({ id, serviceNumber: `NX-${code === 'POLICE' ? 'GPS' : 'GPRS'}-${pad(i, 5)}`, ...n, dateOfBirth: dateOnly(daysAgo(int(23 * 365, 58 * 365))), enlistmentDate: dateOnly(enlist), currentRankId: rk, currentOrgUnitId: unit.id, isSynthetic: true });
      const moved = daysAgo(int(30, 380));
      if (prevUnit.id !== unit.id) postings.push({ personnelId: id, toOrgUnitId: prevUnit.id, status: 'ENDED', effectiveFrom: enlist, effectiveTo: moved, reason: 'Initial posting' });
      postings.push({ personnelId: id, fromOrgUnitId: prevUnit.id !== unit.id ? prevUnit.id : null, toOrgUnitId: unit.id, status: 'CONFIRMED', effectiveFrom: prevUnit.id !== unit.id ? moved : enlist, reason: 'Service requirement' });
      ranksH.push({ personnelId: id, rankId: rk, effectiveFrom: dateOnly(daysAgo(int(60, 399))), authorityRef: `NX-PRM-${pad(i, 5)}` });
    }
    return { rows, postings, ranksH };
  };
  const pol = await personnel('POLICE', 400, [...active.map((x) => x.unit), ...commands.values()], [policeHQ, cid, policeHR], ['ACP', 'CSUPT', 'SUPT', 'DSP', 'ASP', 'CINSP', 'INSP', 'SGT', 'CPL', 'LCPL', 'CONST']);
  await prisma.policePersonnel.createMany({ data: pol.rows }); await prisma.policePosting.createMany({ data: pol.postings }); await prisma.policeRankHistory.createMany({ data: pol.ranksH });
  const pri = await personnel('PRISONS', 200, prisons.map((x) => x.unit), [prisonsHQ, prisonsHR], ['ADP', 'CSUPT', 'SUPT', 'DSP', 'ASP', 'SCO', 'CO', 'ACO', 'SGT', 'CPL', 'LCPL', '2CO']);
  await prisma.prisonPersonnel.createMany({ data: pri.rows }); await prisma.prisonPosting.createMany({ data: pri.postings }); await prisma.prisonRankHistory.createMany({ data: pri.ranksH });
  // command appointments (held by a person, at a unit — independent of rank)
  const byUnit = (rows: any[], unitId: string) => rows.find((r) => r.currentOrgUnitId === unitId);
  await prisma.policeCommandAssignment.createMany({ data: active.map((st) => byUnit(pol.rows, st.unit.id)).filter(Boolean).map((p: any, i: number) => ({ personnelId: p.id, appointmentId: appt['POLICE:STATION_OFFICER'], orgUnitId: p.currentOrgUnitId, effectiveFrom: dateOnly(daysAgo(200)), authorityRef: `NX-APT-${pad(i + 1, 4)}` })) });
  await prisma.prisonCommandAssignment.createMany({ data: prisons.map((pr) => byUnit(pri.rows, pr.unit.id)).filter(Boolean).map((p: any, i: number) => ({ personnelId: p.id, appointmentId: appt['PRISONS:OFFICER_IN_CHARGE'], orgUnitId: p.currentOrgUnitId, effectiveFrom: dateOnly(daysAgo(300)), authorityRef: `NX-APT-${pad(500 + i, 4)}` })) });

  // ── Police operations: 480 arrests across every regional command ──
  const incidents: any[] = [], cases: any[] = [], casePersons: any[] = [], arrests: any[] = [], charges: any[] = [], convictions: any[] = [], custody: any[] = [], movements: any[] = [];
  const ARRESTS = 480, OPEN = 70; let rr = 0;
  for (let i = 1; i <= ARRESTS; i++) {
    const st = i % 8 === 1 ? accra : i % 8 === 5 ? kumasi : active[rr++ % active.length];
    const person = persons[i - 1]; const offence = pick(OFFENCES);
    const age = i <= OPEN ? int(2, 70) : int(96, 24 * 400); // the first arrests are recent → open custody
    const at = hoursAgo(age); const incId = randomUUID(), caseId = randomUUID(), arrId = randomUUID(); const where = facilities.find((f) => f.id === st.facilityId)?.town ?? 'Station area';
    incidents.push({ id: incId, reference: `NX-INC-${pad(i, 5)}`, facilityId: st.facilityId, reportedAt: hoursAgo(age + int(1, 48)), category: offence, summary: `${offence} reported at the charge office.`, location: where, status: 'CASE_OPENED', recordedById: polRec });
    const convicted = i > OPEN * 2 && chance(0.35); const closed = convicted || (i > OPEN * 2 && chance(0.3));
    cases.push({ id: caseId, caseNumber: `NX-CASE-${pad(i, 5)}`, facilityId: st.facilityId, incidentId: incId, title: `${offence} — case ${i}`, offenceCategory: offence, status: closed ? 'CLOSED' : i <= OPEN ? 'UNDER_INVESTIGATION' : pick(['UNDER_INVESTIGATION', 'BEFORE_COURT', 'FORWARDED_FOR_ADVICE']), openedAt: at, closedAt: closed ? hoursAgo(age / 2) : null });
    casePersons.push({ caseId, personId: person.id, role: 'SUSPECT' }, { caseId, personId: persons[1199 - (i % 600)].id, role: 'COMPLAINANT' });
    arrests.push({ id: arrId, reference: `NX-ARR-${pad(i, 5)}`, personId: person.id, facilityId: st.facilityId, caseId, arrestedAt: at, location: where, suspectedOffence: offence, legalAuthority: 'Arrest without warrant on reasonable suspicion (Act 30, s.10)', recordedById: polRec,
      arrestBasis: 'WITHOUT_WARRANT_S10', reasonsGivenAt: new Date(at.getTime() + 10 * 60_000), rightToLawyerGivenAt: new Date(at.getTime() + 10 * 60_000), languageUsed: pick(['English', 'Twi', 'Ga', 'Ewe', 'Dagbani']) });
    const chargeId = randomUUID();
    if (i > OPEN) charges.push({ id: chargeId, caseId, arrestId: arrId, personId: person.id!, offence, statuteRef: statuteOf(offence), status: convicted ? 'CONVICTED' : closed ? pick(['WITHDRAWN', 'DISMISSED', 'ACQUITTED']) : 'FILED', filedAt: hoursAgo(age - 40) });
    if (convicted) convictions.push({ personId: person.id!, caseId, chargeId, court: pick(COURTS), courtCaseRef: `NX-CT-${pad(i, 5)}`, offence, convictedAt: dateOnly(hoursAgo(age / 2)), sentenceSummary: `${int(3, 48)} months imprisonment`, recordedById: polRec });
    const epId = randomUUID(); const open = i <= OPEN;
    custody.push({ id: epId, reference: `NX-CUS-${pad(i, 5)}`, personId: person.id, arrestId: arrId, facilityId: st.facilityId, status: open ? 'IN_CUSTODY' : pick(['RELEASED_ON_BAIL', 'TRANSFERRED_TO_COURT', 'REMANDED_TO_PRISON', 'RELEASED_NO_CHARGE']), detainedAt: at, courtDeadlineAt: new Date(at.getTime() + 48 * 3600_000),
      legalAuthority: 'Detained pending investigation; to be brought before a court within 48 hours (Constitution, art. 14(3))', cellRef: `Cell ${int(1, 4)}`, openedById: polRec, closedAt: open ? null : new Date(at.getTime() + int(4, 46) * 3600_000), closedById: open ? null : polRec, dispositionAuthorizedById: open ? null : polCmd, dispositionNote: open ? null : 'Disposition recorded by the station commander' });
    movements.push({ episodeId: epId, type: 'CELL_ASSIGNMENT', toFacilityId: st.facilityId, occurredAt: at, note: 'Placed in cells', recordedById: polRec });
  }
  await prisma.policeIncident.createMany({ data: incidents }); await prisma.policeCase.createMany({ data: cases }); await prisma.casePerson.createMany({ data: casePersons });
  await prisma.arrest.createMany({ data: arrests }); await prisma.charge.createMany({ data: charges }); await prisma.convictionRecord.createMany({ data: convictions });
  await prisma.policeCustodyEpisode.createMany({ data: custody }); await prisma.custodyMovement.createMany({ data: movements });

  // ── Prisons operations: a synthetic population at every establishment, scaled to its capacity ──
  const orders: any[] = [], prisoners: any[] = [], admissions: any[] = [], episodes: any[] = [], sentences: any[] = [], transfers: any[] = [], releases: any[] = [], pIncidents: any[] = [], programmes: any[] = [], enrollments: any[] = [];
  const progByFacility = new Map<string, string[]>();
  for (const pr of prisons) for (const [n, c] of [['Tailoring workshop', 'VOCATIONAL'], ['Adult literacy', 'EDUCATION'], ['Carpentry', 'VOCATIONAL']] as const) { const id = randomUUID(); programmes.push({ id, facilityId: pr.facilityId, name: n, category: c, capacity: 20 }); progByFacility.set(pr.facilityId, [...(progByFacility.get(pr.facilityId) ?? []), id]); }
  const firstPrisonPerson = persons.length, firstPrisonIdent = idents.length; let i = 0;
  for (const pr of prisons) {
    const count = Math.max(Math.min(6, pr.nominal), Math.round(pr.nominal * (0.12 + rnd() * 0.18)));
    for (let k = 0; k < count; k++) {
      i++;
      const person = newPerson(pr.female ? 'FEMALE' : chance(0.97) ? 'MALE' : 'FEMALE'); const convicted = pr.camp || chance(0.6); const days = convicted ? int(5, 900) : int(5, 400); const at = daysAgo(days);
      const recId = randomUUID(), ordId = randomUUID(), admId = randomUUID(), epId = randomUUID();
      prisoners.push({ id: recId, prisonerNumber: `NX-PN-${pad(i, 6)}`, personId: person.id });
      orders.push({ id: ordId, personId: person.id, type: convicted ? 'COMMITMENT_TO_UNDERGO_SENTENCE' : 'REMAND_COMMITMENT_FOR_TRIAL', formNumber: convicted ? 'Form 21' : 'Form 14', court: pick(COURTS), orderRef: `NX-WRT-${pad(i, 6)}`, issuedAt: dateOnly(at), returnDate: convicted ? null : dateOnly(daysAgo(days - 14)), verifiedById: priRec, verifiedAt: at });
      const released = k >= count * 0.85; const transferred = !released && !pr.female && i % 23 === 0;
      // Remand prisoners held beyond their first court date have a renewed remand warrant; a few are left expired for follow-up (CHRAJ reports this is common).
      if (!convicted && days > 14 && !released && i % 9 !== 0) { const issued = daysAgo(int(1, 12)); orders.push({ personId: person.id, type: 'REMAND_COMMITMENT_FOR_TRIAL', formNumber: 'Form 14', court: pick(COURTS), orderRef: `NX-WRT-${pad(i, 6)}-R`, issuedAt: dateOnly(issued), returnDate: dateOnly(new Date(issued.getTime() + 14 * 86400_000)), verifiedById: priRec, verifiedAt: issued }); }
      admissions.push({ id: admId, reference: `NX-ADM-${pad(i, 6)}`, prisonerRecordId: recId, facilityId: pr.facilityId, courtOrderId: ordId, classification: convicted ? 'CONVICTED' : 'REMAND', admittedAt: at, identityCheckedById: priRec, recordedById: priRec,
        escortingOfficer: 'Police escort', conditionAtHandover: 'Sober, no visible injuries', medicalScreenedAt: at, screenedByRole: 'MEDICAL_OFFICER', fitForAdmission: true });
      const dest = transferred ? prisons.filter((p) => p !== pr && !p.female && p.command === pr.command)[0] ?? prisons.find((p) => p !== pr && !p.female)! : pr;
      episodes.push({ id: epId, prisonerRecordId: recId, admissionId: admId, facilityId: dest.facilityId, housingUnitId: pick(dest.housing), classification: convicted ? 'CONVICTED' : 'REMAND', status: released ? 'RELEASED' : 'IN_CUSTODY', startedAt: at, endedAt: released ? daysAgo(int(1, 4)) : null });
      if (convicted) { const term = int(6, 60); sentences.push({ prisonerRecordId: recId, courtOrderId: ordId, offence: pick(OFFENCES), sentenceText: `${term} months imprisonment`, termMonths: term, sentencedAt: dateOnly(at), sentenceStartDate: dateOnly(at), latestReleaseDate: dateOnly(new Date(at.getTime() + term * 30.4 * 86400_000)), recordedById: priRec }); }
      if (transferred) transfers.push({ reference: `NX-TRF-${pad(i, 6)}`, episodeId: epId, fromFacilityId: pr.facilityId, toFacilityId: dest.facilityId, reason: 'Decongestion', status: 'RECEIVED', initiatedById: priRec, approvedById: priSup, approvedAt: daysAgo(3), dispatchedAt: daysAgo(3), receivedById: priRec, receivedAt: daysAgo(2) });
      if (released) releases.push({ reference: `NX-REL-${pad(i, 6)}`, episodeId: epId, facilityId: pr.facilityId, type: convicted ? 'END_OF_SENTENCE_WITH_REMISSION' : 'RELEASE_ON_BAIL_ORDER', legalAuthority: convicted ? 'Sentence served per warrant of commitment' : 'Order of release on bail', status: 'COMPLETED', initiatedById: priRec, approvedById: priSup, approvedAt: daysAgo(5), releasedAt: daysAgo(int(1, 4)), warrantReturnedAt: daysAgo(1) });
      if (!released && chance(0.3)) enrollments.push({ programmeId: pick(progByFacility.get(dest.facilityId)!), prisonerRecordId: recId });
    }
  }
  for (let n = 1; n <= 90; n++) pIncidents.push({ reference: `NX-PIN-${pad(n, 5)}`, facilityId: prisons[n % prisons.length].facilityId, occurredAt: daysAgo(int(1, 200)), category: pick(['Contraband', 'Medical', 'Altercation', 'Property']), summary: 'Operational incident recorded by the duty officer.', severity: pick(['LOW', 'LOW', 'MEDIUM', 'HIGH']), recordedById: priRec });
  await inBatches(persons.slice(firstPrisonPerson), (d) => prisma.person.createMany({ data: d }));
  await inBatches(idents.slice(firstPrisonIdent), (d) => prisma.personIdentifier.createMany({ data: d }));
  for (const [rows, write] of [[prisoners, (d: any) => prisma.prisonerRecord.createMany({ data: d })], [orders, (d: any) => prisma.courtOrder.createMany({ data: d })], [admissions, (d: any) => prisma.prisonAdmission.createMany({ data: d })],
    [episodes, (d: any) => prisma.prisonCustodyEpisode.createMany({ data: d })], [sentences, (d: any) => prisma.sentenceRecord.createMany({ data: d })], [transfers, (d: any) => prisma.prisonTransfer.createMany({ data: d })],
    [releases, (d: any) => prisma.prisonRelease.createMany({ data: d })], [pIncidents, (d: any) => prisma.prisonIncident.createMany({ data: d })],
    [programmes, (d: any) => prisma.rehabilitationProgramme.createMany({ data: d })], [enrollments, (d: any) => prisma.rehabilitationEnrollment.createMany({ data: d })]] as const) await inBatches(rows as any[], write as any);

  // ── Background-check applications (internal case processing; not a replacement for the official e-service) ──
  const applicant = userId[acct('applicant')];
  const statuses = ['SUBMITTED', 'SUBMITTED', 'PAYMENT_CONFIRMED', 'APPOINTMENT_BOOKED', 'BIOMETRICS_CAPTURED', 'RECORDS_SEARCHED', 'UNDER_REVIEW', 'UNDER_REVIEW', 'REJECTED', 'SUBMITTED'] as const;
  await prisma.backgroundCheckApplication.createMany({ data: statuses.map((status, n) => { const p = persons[700 + n]; return { reference: `NX-BGC-${pad(n + 1, 5)}`, applicantUserId: applicant, personId: status === 'SUBMITTED' ? null : p.id!, fullName: `${p.otherNames} ${p.surname}`, dateOfBirth: p.dateOfBirth as Date, identifierType: 'GHANA_CARD' as const, identifierValue: syntheticCard(701 + n), purpose: pick(['Employment', 'Travel / visa', 'Education']), status, submittedAt: daysAgo(10 - n), residenceAttested: true,
    criminalIdent: ['RECORDS_SEARCHED', 'UNDER_REVIEW', 'REJECTED'].includes(status) ? 'NOT_IDENT' as const : null }; }) });

  await syncClearanceReference();
  await prisma.auditEvent.create({ data: { action: 'system.seed', outcome: 'SUCCESS', detail: { orgUnits: units.length, facilities: facilities.length, persons: persons.length, policePersonnel: 400, prisonPersonnel: 200, register: REGISTER_REF } } });
  console.log(`Done. ${units.length} org units, ${facilities.length} facilities (${stations.length} police stations and posts, ${prisons.length} prison establishments), ${persons.length} synthetic persons, ${custody.length} police custody episodes, ${episodes.length} prison episodes.`);
  // The password is never printed: build logs are kept by the host. It is the DEMO_PASSWORD setting (default in .env.example).
  console.log('Seeded role accounts (password: the DEMO_PASSWORD setting):'); accounts.forEach(([e, , r]) => console.log(`  ${e.padEnd(46)} ${r}`));
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
  const institutions = new Map((await prisma.institution.findMany()).map((i) => [i.code, i.id]));
  for (const r of ROLES) {
    // Roles added to the contract after the first seed are created here, so every deploy carries the full matrix.
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, scopeLevel: r.scopeLevel, workspace: r.workspace },
      create: { code: r.code, name: r.name, institutionId: r.institution ? institutions.get(r.institution)! : null, scopeLevel: r.scopeLevel, workspace: r.workspace },
    });
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({ data: r.permissions.map((p) => ({ roleId: role.id, permissionId: perms.get(p)! })) }),
    ]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
