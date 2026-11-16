/** Day 2 — police workflow acceptance tests (Workflow A: custody; Workflow B: posting). */
import { startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const RECORDS = 'police.records@nexcust.fourthit.com', COMMANDER = 'police.station@nexcust.fourthit.com', KUMASI = 'police.records.kumasi@nexcust.fourthit.com';
const HR = 'police.hr@nexcust.fourthit.com', NATIONAL = 'police.national@nexcust.fourthit.com', REGIONAL = 'police.regional@nexcust.fourthit.com';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
let accra1: string, ashanti1: string;

beforeAll(async () => {
  h = await startApp();
  accra1 = (await h.prisma.facility.findFirstOrThrow({ where: { name: 'Nima Police Station' } })).id;
  ashanti1 = (await h.prisma.facility.findFirstOrThrow({ where: { name: 'Manhyia Police Station' } })).id;
});
afterAll(async () => { await h.app.close(); });

describe('identity records (no automatic merging)', () => {
  it('blocks creation when similar names exist until an officer confirms it is a different person', async () => {
    const a = await h.as(RECORDS); const tag = uniq(); const body = { surname: `Testsurname${tag}`, otherNames: 'Kwame Demo', sex: 'MALE', dateOfBirth: '1990-04-02' };
    const first = (await a.post('/api/persons').send(body).expect(201)).body;
    expect(first.indexNumber).toMatch(/^NX-NPI-/);
    const dup = await a.post('/api/persons').send(body).expect(409);
    expect(dup.body.code).toBe('POSSIBLE_DUPLICATES'); expect(dup.body.matches[0].id).toBe(first.id);
    const second = (await a.post('/api/persons').send({ ...body, confirmedNotDuplicate: true }).expect(201)).body;
    expect(second.id).not.toBe(first.id); // two records, never merged on name alone
  });
  it('treats an identifier already on file as a hard stop', async () => {
    const a = await h.as(RECORDS); const tag = uniq(); const id = { identifierType: 'GHANA_CARD', identifierValue: `GHA-NXT${tag}` };
    await a.post('/api/persons').send({ surname: `Idsurname${tag}`, otherNames: 'Ama Demo', sex: 'FEMALE', ...id }).expect(201);
    const res = await a.post('/api/persons').send({ surname: `Other${tag}`, otherNames: 'Esi Demo', sex: 'FEMALE', ...id, confirmedNotDuplicate: true }).expect(409);
    expect(res.body.code).toBe('IDENTIFIER_EXISTS');
  });
  it('requires person.write (HR officer and prison staff rules are separate)', async () => {
    await (await h.as(HR)).post('/api/persons').send({ surname: 'Nope', otherNames: 'Nope', sex: 'MALE' }).expect(403);
  });
});

describe('Workflow A — arrest and custody', () => {
  let personId: string, custodyId: string, arrestRef: string;
  beforeAll(async () => {
    personId = (await (await h.as(RECORDS)).post('/api/persons').send({ surname: `Detainee${uniq()}`, otherNames: 'Kofi Demo', sex: 'MALE' }).expect(201)).body.id;
  });
  const arrest = (over: object = {}) => ({ personId, facilityId: accra1, arrestedAt: new Date(Date.now() - 3600_000).toISOString(), suspectedOffence: 'Stealing', legalAuthority: 'Arrest on reasonable suspicion (test)', detain: true, cellRef: 'Cell 2',
    arrestBasis: 'WITHOUT_WARRANT_S10', reasonsGivenAt: new Date(Date.now() - 3500_000).toISOString(), rightToLawyerGivenAt: new Date(Date.now() - 3500_000).toISOString(), languageUsed: 'Twi', ...over });

  it('registers a detainee: arrest + custody episode with a court deadline, saved and searchable', async () => {
    const a = await h.as(RECORDS);
    const res = (await a.post('/api/police/arrests').send(arrest()).expect(201)).body;
    custodyId = res.custody.id; arrestRef = res.arrest.reference;
    expect(res.custody.status).toBe('IN_CUSTODY');
    expect(new Date(res.custody.courtDeadlineAt).getTime() - new Date(res.custody.detainedAt).getTime()).toBe(48 * 3600_000);
    const list = (await a.get('/api/police/custody?status=IN_CUSTODY&q=Detainee&pageSize=100').expect(200)).body;
    expect(list.items.some((i: any) => i.id === custodyId)).toBe(true);
    const detail = (await a.get(`/api/police/custody/${custodyId}`).expect(200)).body;
    expect(detail.movements).toHaveLength(1);
  });
  it('records the rights information given at arrest and runs the 48-hour clock from the arrest', async () => {
    const arr = await h.prisma.arrest.findFirstOrThrow({ where: { personId }, include: { custodyEpisodes: true } });
    expect(arr).toMatchObject({ arrestBasis: 'WITHOUT_WARRANT_S10', languageUsed: 'Twi' }); expect(arr.reasonsGivenAt).not.toBeNull();
    expect(arr.custodyEpisodes[0].courtDeadlineAt!.getTime() - arr.arrestedAt.getTime()).toBe(48 * 3600_000);
  });
  it('requires the warrant reference for an arrest under warrant, and rights information not dated before arrest', async () => {
    const a = await h.as(RECORDS); const p = (await a.post('/api/persons').send({ surname: `Warrant${uniq()}`, otherNames: 'Kofi Demo', sex: 'MALE' }).expect(201)).body.id;
    await a.post('/api/police/arrests').send(arrest({ personId: p, arrestBasis: 'WARRANT', detain: false })).expect(400);
    await a.post('/api/police/arrests').send(arrest({ personId: p, detain: false, reasonsGivenAt: new Date(Date.now() - 7200_000).toISOString() })).expect(400);
  });
  it('flags a juvenile (under 18 at arrest) with a 48-hour detention-order deadline and records the parent notice', async () => {
    const a = await h.as(RECORDS); const dob = new Date(Date.now() - 16 * 365.25 * 86400_000).toISOString().slice(0, 10);
    const p = (await a.post('/api/persons').send({ surname: `Juvenile${uniq()}`, otherNames: 'Yaw Demo', sex: 'MALE', dateOfBirth: dob }).expect(201)).body.id;
    const res = (await a.post('/api/police/arrests').send(arrest({ personId: p })).expect(201)).body;
    expect(res.custody.isJuvenile).toBe(true); expect(res.custody.juvenileDetentionOrderDueAt).not.toBeNull();
    await a.post(`/api/police/custody/${res.custody.id}/juvenile-notice`).send({ parentGuardianNotifiedAt: new Date().toISOString() }).expect(201);
    await a.post(`/api/police/custody/${custodyId}/juvenile-notice`).send({ parentGuardianNotifiedAt: new Date().toISOString() }).expect(400); // adult
  });
  it('refuses a second open custody episode for the same person', async () => {
    await (await h.as(RECORDS)).post('/api/police/arrests').send(arrest()).expect(409);
  });
  it('refuses to register an arrest at a station outside the officer\'s jurisdiction, and logs it', async () => {
    const before = await h.denied(RECORDS);
    await (await h.as(RECORDS)).post('/api/police/arrests').send(arrest({ facilityId: ashanti1, detain: false })).expect(403);
    expect(await h.denied(RECORDS)).toBe(before + 1);
  });
  it('rejects invalid input (future arrest time, missing legal authority)', async () => {
    const a = await h.as(RECORDS);
    await a.post('/api/police/arrests').send(arrest({ arrestedAt: new Date(Date.now() + 86400_000).toISOString(), detain: false })).expect(400);
    await a.post('/api/police/arrests').send(arrest({ legalAuthority: '', detain: false })).expect(400);
  });
  it('keeps the new record invisible to another station', async () => {
    const a = await h.as(KUMASI);
    await a.get(`/api/police/custody/${custodyId}`).expect(403);
    await a.post(`/api/police/custody/${custodyId}/movements`).send({ type: 'MEDICAL', note: 'Should be refused' }).expect(403);
  });
  it('records movements as append-only history', async () => {
    await (await h.as(RECORDS)).post(`/api/police/custody/${custodyId}/movements`).send({ type: 'COURT_APPEARANCE', note: 'Taken to court (test)' }).expect(201);
    const mv = await h.prisma.custodyMovement.findFirstOrThrow({ where: { episodeId: custodyId, type: 'COURT_APPEARANCE' } });
    await expect(h.prisma.custodyMovement.delete({ where: { id: mv.id } })).rejects.toThrow(/append-only/);
  });
  it('does not let the records officer close custody (no permission)', async () => {
    await (await h.as(RECORDS)).post(`/api/police/custody/${custodyId}/close`).send({ disposition: 'RELEASED_ON_BAIL', dispositionNote: 'Not authorized' }).expect(403);
  });
  it('lets the station commander review and close with an authorized disposition', async () => {
    const c = await h.as(COMMANDER);
    await c.post(`/api/police/custody/${custodyId}/review`).expect(201);
    await c.post(`/api/police/custody/${custodyId}/close`).send({ disposition: 'RELEASED_ON_BAIL', dispositionNote: 'Police enquiry bail granted (test)' }).expect(400); // bond required
    await c.post(`/api/police/custody/${custodyId}/close`).send({ disposition: 'RELEASED_ON_BAIL', dispositionNote: 'Police enquiry bail granted (test)',
      bailBond: { amountGhs: 5000, sureties: [{ name: 'Ama Surety', idRef: 'GHA-NXSURETY-1', address: 'House 12, Nima, Accra' }], reportTo: 'POLICE_STATION', reportPlace: 'Nima Police Station',
        reportAt: new Date(Date.now() + 7 * 86400_000).toISOString() } }).expect(201);
    const ep = await h.prisma.policeCustodyEpisode.findUniqueOrThrow({ where: { id: custodyId }, include: { bailBond: true } });
    expect(ep).toMatchObject({ status: 'RELEASED_ON_BAIL' }); expect(ep.bailBond).toMatchObject({ amountGhs: 5000, reportTo: 'POLICE_STATION' }); expect(ep.closedAt).not.toBeNull(); expect(ep.dispositionAuthorizedById).not.toBe(ep.openedById);
    await c.post(`/api/police/custody/${custodyId}/close`).send({ disposition: 'CLOSED_OTHER', dispositionNote: 'Second close' }).expect(409);
    const audit = await h.prisma.auditEvent.findFirst({ where: { action: 'police.custody.close', entityId: custodyId, outcome: 'SUCCESS' } });
    expect(audit?.actorEmail).toBe(COMMANDER);
  });
  it('shows the person record with arrests and convictions as separate facts', async () => {
    const rec = (await (await h.as(RECORDS)).get(`/api/police/persons/${personId}/record`).expect(200)).body;
    expect(rec.arrests.map((x: any) => x.reference)).toContain(arrestRef);
    expect(rec.convictions).toEqual([]); // an arrest is not a conviction
    const other = (await (await h.as(KUMASI)).get(`/api/police/persons/${personId}/record`).expect(200)).body;
    expect(other.arrests).toEqual([]); expect(other.recordsHeldByOtherCommands).toBe(1);
  });
  it('creates and updates a case within jurisdiction only', async () => {
    const a = await h.as(RECORDS);
    const c = (await a.post('/api/police/cases').send({ facilityId: accra1, title: 'Test case — stealing', offenceCategory: 'Stealing', incidentSummary: 'Synthetic test incident summary.', suspectPersonId: personId }).expect(201)).body;
    expect(c.caseNumber).toMatch(/^NX-CASE-/);
    await a.patch(`/api/police/cases/${c.id}`).send({ status: 'BEFORE_COURT' }).expect(200);
    expect((await a.get(`/api/police/cases/${c.id}`).expect(200)).body.status).toBe('BEFORE_COURT');
    await (await h.as(KUMASI)).patch(`/api/police/cases/${c.id}`).send({ status: 'CLOSED' }).expect(403);
    await a.post('/api/police/cases').send({ facilityId: ashanti1, title: 'Outside scope', offenceCategory: 'Stealing', incidentSummary: 'Synthetic test incident summary.' }).expect(403);
  });
});

describe('Workflow B — police posting (propose → approve → confirm)', () => {
  let officerId: string, fromUnit: string, toUnit: string, postingId: string;
  beforeAll(async () => {
    toUnit = (await h.prisma.organizationalUnit.findFirstOrThrow({ where: { name: 'Nima Police Station' } })).id;
    const officer = await h.prisma.policePersonnel.findFirstOrThrow({ where: { currentOrgUnit: { code: { startsWith: 'GPS-ST-NORTHERN-' } }, postings: { none: { status: { in: ['PROPOSED', 'APPROVED'] } } } } });
    officerId = officer.id; fromUnit = officer.currentOrgUnitId;
  });
  it('HR proposes; HR cannot approve their own proposal', async () => {
    const hr = await h.as(HR);
    postingId = (await hr.post('/api/police/postings').send({ personnelId: officerId, toOrgUnitId: toUnit, reason: 'Service requirement (test)' }).expect(201)).body.id;
    await hr.post(`/api/police/postings/${postingId}/approve`).expect(403);
    await hr.post('/api/police/postings').send({ personnelId: officerId, toOrgUnitId: toUnit, reason: 'Duplicate proposal' }).expect(409);
  });
  it('a commander outside the releasing command cannot approve', async () => {
    await (await h.as(REGIONAL)).post(`/api/police/postings/${postingId}/approve`).expect(403); // Accra region; officer serves in Northern
  });
  it('cannot be confirmed before approval', async () => {
    await (await h.as(COMMANDER)).post(`/api/police/postings/${postingId}/confirm`).expect(409);
  });
  it('an authorized supervisor approves, the receiving station confirms, and history is preserved', async () => {
    await (await h.as(NATIONAL)).post(`/api/police/postings/${postingId}/approve`).expect(201);
    expect((await h.prisma.policePersonnel.findUniqueOrThrow({ where: { id: officerId } })).currentOrgUnitId).toBe(fromUnit); // not moved yet
    await (await h.as(COMMANDER)).post(`/api/police/postings/${postingId}/confirm`).expect(201);
    const officer = (await (await h.as(HR)).get(`/api/police/personnel/${officerId}`).expect(200)).body;
    expect(officer.currentOrgUnitId).toBe(toUnit);
    const current = officer.postings.filter((p: any) => p.status === 'CONFIRMED' && !p.effectiveTo);
    expect(current).toHaveLength(1); expect(current[0].toOrgUnitId).toBe(toUnit);
    const previous = officer.postings.find((p: any) => p.toOrgUnitId === fromUnit);
    expect(previous).toMatchObject({ status: 'ENDED' }); expect(previous.effectiveTo).not.toBeNull();
    expect(officer.rankHistory.length).toBeGreaterThan(0); // rank untouched by a posting
  });
});
