/** Day 3 — prisons workflow acceptance tests (Workflow D: admission; Workflow E: transfer and release). */
import { startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const RECORDS = 'prisons.records@justiceone.demo', NORTH = 'prisons.records.north@justiceone.demo', OIC = 'prisons.superintendent@justiceone.demo';
const NATIONAL = 'prisons.national@justiceone.demo', HR = 'prisons.hr@justiceone.demo', POLICE = 'police.records@justiceone.demo';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
let ashanti: string, north: string, housing: string;

beforeAll(async () => {
  h = await startApp();
  const a = await h.prisma.facility.findFirstOrThrow({ where: { name: 'DEMO Ashanti Central Prison' }, include: { housingUnits: true } });
  ashanti = a.id; housing = a.housingUnits[0].id;
  north = (await h.prisma.facility.findFirstOrThrow({ where: { name: 'DEMO Northern Central Prison' } })).id;
});
afterAll(async () => { await h.app.close(); });

const newPerson = async () => (await (await h.as(RECORDS)).post('/api/persons').send({ surname: `Inmate${uniq()}`, otherNames: 'Yaw Demo', sex: 'MALE' }).expect(201)).body.id as string;
const remand = (personId: string, over: object = {}) => ({ personId, facilityId: ashanti, housingUnitId: housing, warrantType: 'REMAND_WARRANT', court: 'DEMO Circuit Court A', warrantRef: `DEMO-WRT-T${uniq()}`, warrantIssuedAt: new Date().toISOString().slice(0, 10), ...over });

describe('Workflow D — admission', () => {
  let personId: string, episodeId: string;
  beforeAll(async () => { personId = await newPerson(); });

  it('admits on a verified remand warrant: prisoner record, admission and custody episode are created and searchable', async () => {
    const a = await h.as(RECORDS);
    const res = (await a.post('/api/prisons/admissions').send(remand(personId)).expect(201)).body;
    episodeId = res.episode.id;
    expect(res.prisonerRecord.prisonerNumber).toMatch(/^DEMO-PN-/); expect(res.episode).toMatchObject({ status: 'IN_CUSTODY', classification: 'REMAND' });
    const list = (await a.get(`/api/prisons/prisoners?q=${res.prisonerRecord.prisonerNumber}`).expect(200)).body;
    expect(list.items.map((i: any) => i.id)).toContain(episodeId);
    const detail = (await a.get(`/api/prisons/prisoners/${episodeId}`).expect(200)).body;
    expect(detail.admission.courtOrder.type).toBe('REMAND_WARRANT'); expect(detail.admission.courtOrder.verifiedById).not.toBeNull();
  });
  it('refuses a second admission while the person is held', async () => {
    await (await h.as(RECORDS)).post('/api/prisons/admissions').send(remand(personId)).expect(409);
  });
  it('requires the legal authority, and sentence particulars for a committal warrant', async () => {
    const a = await h.as(RECORDS); const p = await newPerson();
    await a.post('/api/prisons/admissions').send(remand(p, { warrantRef: '' })).expect(400);
    await a.post('/api/prisons/admissions').send(remand(p, { warrantType: 'COMMITTAL_WARRANT' })).expect(400);
    const ok = (await a.post('/api/prisons/admissions').send(remand(p, { warrantType: 'COMMITTAL_WARRANT', offence: 'Stealing', sentenceText: '12 months imprisonment (test)', termMonths: 12, latestReleaseDate: '2027-11-01' })).expect(201)).body;
    const sentence = await h.prisma.sentenceRecord.findFirstOrThrow({ where: { prisonerRecordId: ok.prisonerRecord.id } });
    expect(sentence.latestReleaseDate?.toISOString().slice(0, 10)).toBe('2027-11-01'); // stored as entered, never computed
  });
  it('refuses admission to another establishment or by police staff, and logs it', async () => {
    const p = await newPerson(); const before = await h.denied(RECORDS);
    await (await h.as(RECORDS)).post('/api/prisons/admissions').send(remand(p, { facilityId: north, housingUnitId: undefined })).expect(403);
    expect(await h.denied(RECORDS)).toBe(before + 1);
    await (await h.as(POLICE)).post('/api/prisons/admissions').send(remand(p)).expect(403);
  });
  it('enrolls the prisoner in a programme offered at their establishment only', async () => {
    const a = await h.as(RECORDS);
    const own = await h.prisma.rehabilitationProgramme.findFirstOrThrow({ where: { facilityId: ashanti } });
    const other = await h.prisma.rehabilitationProgramme.findFirstOrThrow({ where: { facilityId: north } });
    await a.post('/api/prisons/rehabilitation/enrollments').send({ episodeId, programmeId: other.id }).expect(400);
    await a.post('/api/prisons/rehabilitation/enrollments').send({ episodeId, programmeId: own.id }).expect(201);
    await a.post('/api/prisons/rehabilitation/enrollments').send({ episodeId, programmeId: own.id }).expect(409);
  });
});

describe('Workflow E — transfer then release', () => {
  let episodeId: string, transferId: string, releaseId: string;
  beforeAll(async () => {
    episodeId = (await (await h.as(RECORDS)).post('/api/prisons/admissions').send(remand(await newPerson())).expect(201)).body.episode.id;
  });

  it('records officer initiates; cannot approve (no permission); superintendent approves and prisoner is in transit', async () => {
    const a = await h.as(RECORDS);
    transferId = (await a.post('/api/prisons/transfers').send({ episodeId, toFacilityId: north, reason: 'Decongestion (test)' }).expect(201)).body.id;
    await a.post('/api/prisons/transfers').send({ episodeId, toFacilityId: north, reason: 'Duplicate request' }).expect(409);
    await a.post(`/api/prisons/transfers/${transferId}/approve`).expect(403);
    await a.post('/api/prisons/releases').send({ episodeId, type: 'BAIL', legalAuthority: 'Blocked while transfer pending' }).expect(409);
    await (await h.as(NORTH)).post(`/api/prisons/transfers/${transferId}/receive`).expect(409); // not dispatched yet
    await (await h.as(OIC)).post(`/api/prisons/transfers/${transferId}/approve`).expect(201);
    expect((await h.prisma.prisonCustodyEpisode.findUniqueOrThrow({ where: { id: episodeId } })).status).toBe('IN_TRANSIT');
  });
  it('both establishments see the transfer; only the receiving one can confirm arrival', async () => {
    const ids = async (email: string) => (await (await h.as(email)).get('/api/prisons/transfers?pageSize=100').expect(200)).body.items.map((t: any) => t.id);
    expect(await ids(RECORDS)).toContain(transferId); expect(await ids(NORTH)).toContain(transferId);
    await (await h.as(RECORDS)).post(`/api/prisons/transfers/${transferId}/receive`).expect(403);
    await (await h.as(NORTH)).get(`/api/prisons/prisoners/${episodeId}`).expect(403); // not on the receiving register until arrival is confirmed
    await (await h.as(NORTH)).post(`/api/prisons/transfers/${transferId}/receive`).expect(201);
  });
  it('after receipt the prisoner is on the receiving register and off the sending one; history is kept', async () => {
    const ep = await h.prisma.prisonCustodyEpisode.findUniqueOrThrow({ where: { id: episodeId }, include: { transfers: true } });
    expect(ep).toMatchObject({ status: 'IN_CUSTODY', facilityId: north });
    expect(ep.transfers[0]).toMatchObject({ status: 'RECEIVED', fromFacilityId: ashanti, toFacilityId: north });
    await (await h.as(NORTH)).get(`/api/prisons/prisoners/${episodeId}`).expect(200);
    await (await h.as(RECORDS)).get(`/api/prisons/prisoners/${episodeId}`).expect(403);
  });
  it('release needs a legal authority and a second officer; completion closes the custody episode', async () => {
    const n = await h.as(NORTH);
    await n.post('/api/prisons/releases').send({ episodeId, type: 'BAIL', legalAuthority: '' }).expect(400);
    releaseId = (await n.post('/api/prisons/releases').send({ episodeId, type: 'BAIL', legalAuthority: 'Bail granted by DEMO Circuit Court A (test)' }).expect(201)).body.id;
    await n.post(`/api/prisons/releases/${releaseId}/approve`).expect(403); // records officer cannot authorize
    await (await h.as(OIC)).post(`/api/prisons/releases/${releaseId}/approve`).expect(403); // another establishment's officer-in-charge
    expect((await h.prisma.prisonCustodyEpisode.findUniqueOrThrow({ where: { id: episodeId } })).status).toBe('IN_CUSTODY');
    await (await h.as(NATIONAL)).post(`/api/prisons/releases/${releaseId}/approve`).expect(201);
    const ep = await h.prisma.prisonCustodyEpisode.findUniqueOrThrow({ where: { id: episodeId }, include: { release: true } });
    expect(ep.status).toBe('RELEASED'); expect(ep.endedAt).not.toBeNull();
    expect(ep.release).toMatchObject({ status: 'COMPLETED' }); expect(ep.release!.approvedById).not.toBe(ep.release!.initiatedById);
    const events = await h.prisma.auditEvent.findMany({ where: { entityId: releaseId, outcome: 'SUCCESS' }, orderBy: { occurredAt: 'asc' } });
    expect(events.map((e) => [e.action, e.actorEmail])).toEqual([['prisons.release.initiate', NORTH], ['prisons.release.approve', NATIONAL]]);
    await (await h.as(NATIONAL)).post(`/api/prisons/releases/${releaseId}/approve`).expect(409);
  });
  it('a released person can be admitted again as a new episode under the same prisoner record', async () => {
    const ep = await h.prisma.prisonCustodyEpisode.findUniqueOrThrow({ where: { id: episodeId }, include: { prisonerRecord: true } });
    const again = (await (await h.as(RECORDS)).post('/api/prisons/admissions').send(remand(ep.prisonerRecord.personId)).expect(201)).body;
    expect(again.prisonerRecord.id).toBe(ep.prisonerRecordId); expect(again.episode.id).not.toBe(episodeId);
  });
});

describe('prison officer posting', () => {
  it('HR proposes, national approves, receiving officer-in-charge confirms; history preserved', async () => {
    const to = (await h.prisma.organizationalUnit.findFirstOrThrow({ where: { name: 'DEMO Ashanti Central Prison' } })).id;
    const officer = await h.prisma.prisonPersonnel.findFirstOrThrow({ where: { currentOrgUnit: { name: { startsWith: 'DEMO Western' } }, postings: { none: { status: { in: ['PROPOSED', 'APPROVED'] } } } } });
    const hr = await h.as(HR);
    const id = (await hr.post('/api/prisons/postings').send({ personnelId: officer.id, toOrgUnitId: to, reason: 'Service requirement (test)' }).expect(201)).body.id;
    await hr.post(`/api/prisons/postings/${id}/approve`).expect(403);
    await (await h.as(NATIONAL)).post(`/api/prisons/postings/${id}/approve`).expect(201);
    await (await h.as(OIC)).post(`/api/prisons/postings/${id}/confirm`).expect(201);
    const after = (await hr.get(`/api/prisons/personnel/${officer.id}`).expect(200)).body;
    expect(after.currentOrgUnitId).toBe(to);
    expect(after.postings.find((p: any) => p.toOrgUnitId === officer.currentOrgUnitId)).toMatchObject({ status: 'ENDED' });
  });
});
