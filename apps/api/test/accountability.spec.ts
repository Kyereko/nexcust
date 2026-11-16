/** Juvenile identity protection (Act 653 s.3), search and property (Act 30 s.8), monthly return (Act 30 s.16). */
import { startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const RECORDS = 'police.records@nexcust.demo', COMMANDER = 'police.station@nexcust.demo', NATIONAL = 'police.national@nexcust.demo', PRISON_REC = 'prisons.records@nexcust.demo';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
let accra1: string;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const arrest = (personId: string, over: object = {}) => ({ personId, facilityId: accra1, arrestedAt: iso(3600_000), suspectedOffence: 'Stealing', legalAuthority: 'Reasonable suspicion (test)',
  detain: true, arrestBasis: 'WITHOUT_WARRANT_S10', reasonsGivenAt: iso(3500_000), rightToLawyerGivenAt: iso(3500_000), languageUsed: 'English', ...over });
const person = async (over: object = {}) => (await (await h.as(RECORDS)).post('/api/persons').send({ surname: `Acct${uniq()}`, otherNames: 'Demo Person', sex: 'MALE', ...over }).expect(201)).body.id as string;

beforeAll(async () => { h = await startApp(); accra1 = (await h.prisma.facility.findFirstOrThrow({ where: { name: 'DEMO Accra Station 1' } })).id; });
afterAll(async () => { await h.app.close(); });

describe('juvenile identity protection (Act 653 s.3)', () => {
  let juvenileId: string, episodeId: string;
  beforeAll(async () => {
    juvenileId = await person({ dateOfBirth: new Date(Date.now() - 15 * 365.25 * 86400_000).toISOString().slice(0, 10) });
    episodeId = (await (await h.as(RECORDS)).post('/api/police/arrests').send(arrest(juvenileId)).expect(201)).body.custody.id;
  });
  it('shows identity to the handling station and protects it from others with custody access', async () => {
    const own = (await (await h.as(RECORDS)).get(`/api/police/custody/${episodeId}`).expect(200)).body;
    expect(own.person.id).toBe(juvenileId); expect(own.person.surname).toMatch(/^Acct/);
    const national = (await (await h.as(NATIONAL)).get(`/api/police/custody/${episodeId}`).expect(200)).body;
    expect(national.person).toMatchObject({ surname: 'Juvenile', indexNumber: 'PROTECTED', identityProtected: true, identifiers: [] });
    const list = (await (await h.as(NATIONAL)).get('/api/police/custody?status=IN_CUSTODY&pageSize=100').expect(200)).body;
    expect(list.items.find((i: any) => i.id === episodeId).person.surname).toBe('Juvenile');
    expect(JSON.stringify(list)).not.toContain(own.person.surname);
  });
  it('withholds juvenile arrests from the person record and from cross-institution exchange', async () => {
    const rec = (await (await h.as(NATIONAL)).get(`/api/police/persons/${juvenileId}/record`).expect(200)).body;
    expect(rec.arrests).toEqual([]); expect(rec.juvenileRecordsWithheld).toBe(1);
    expect((await (await h.as(RECORDS)).get(`/api/police/persons/${juvenileId}/record`).expect(200)).body.arrests).toHaveLength(1);
    const ex = (await (await h.as(PRISON_REC)).post('/api/exchange/requests').send({ personId: juvenileId, providingInstitution: 'POLICE', purpose: 'Verify custody history (test)', legalBasis: 'Warrant (demo)' }).expect(201)).body;
    expect(ex.disclosedSummary).toMatchObject({ episodes: [], juvenileRecordsWithheld: 1 });
  });
});

describe('search and property (Act 30 s.8)', () => {
  let episodeId: string;
  beforeAll(async () => {
    const p = await person({ sex: 'FEMALE', otherNames: 'Ama Demo' });
    episodeId = (await (await h.as(RECORDS)).post('/api/police/arrests').send(arrest(p)).expect(201)).body.custody.id;
  });
  it('requires a female officer to search a woman unless a reason is recorded', async () => {
    const a = await h.as(RECORDS); const base = { searchedAt: iso(3000_000), searchingOfficer: 'DEMO Cpl. Mensah' };
    await a.post(`/api/police/custody/${episodeId}/search`).send({ ...base, searchingOfficerSex: 'MALE' }).expect(400);
    await a.post(`/api/police/custody/${episodeId}/search`).send({ ...base, searchingOfficerSex: 'MALE', overrideReason: 'No female officer on duty; search of outer garments only (test)' }).expect(201);
    await a.post(`/api/police/custody/${episodeId}/search`).send({ ...base, searchingOfficerSex: 'FEMALE' }).expect(409);
    const ep = await h.prisma.policeCustodyEpisode.findUniqueOrThrow({ where: { id: episodeId } });
    expect(ep.searchOverrideReason).toMatch(/No female officer/);
  });
  it('blocks release until every property item is returned, retained as exhibit or handed over', async () => {
    const a = await h.as(RECORDS);
    const item = (await a.post(`/api/police/custody/${episodeId}/property`).send({ description: 'Mobile phone (test)', quantity: 1, sealedBagRef: 'BAG-001' }).expect(201)).body;
    const close = { disposition: 'RELEASED_NO_CHARGE', dispositionNote: 'Released without charge (test)' };
    await (await h.as(COMMANDER)).post(`/api/police/custody/${episodeId}/close`).send(close).expect(400);
    await a.post(`/api/police/custody/property/${item.id}/outcome`).send({ outcome: 'RETURNED' }).expect(400); // who received it
    await a.post(`/api/police/custody/property/${item.id}/outcome`).send({ outcome: 'RETURNED', receivedBy: 'Detainee in person (test)' }).expect(201);
    await a.post(`/api/police/custody/property/${item.id}/outcome`).send({ outcome: 'RETAINED_AS_EXHIBIT' }).expect(409);
    await (await h.as(COMMANDER)).post(`/api/police/custody/${episodeId}/close`).send(close).expect(201);
  });
});

describe('section 16 monthly return', () => {
  it('lists arrests without warrant with no charge, within the station\'s jurisdiction, with bail status', async () => {
    const p = await person(); await (await h.as(RECORDS)).post('/api/police/arrests').send(arrest(p, { detain: false })).expect(201);
    const month = new Date(Date.now() - 3600_000).toISOString().slice(0, 7);
    const r = (await (await h.as(COMMANDER)).get(`/api/police/reports/s16?month=${month}`).expect(200)).body;
    expect(r.rows.some((x: any) => x.person.id === p && x.custodyStatus === 'NOT_DETAINED')).toBe(true);
    expect(r.stations).toEqual(['DEMO Accra Station 1']);
    expect(r.rows.every((x: any) => ['WITHOUT_WARRANT_S10', 'PRIVATE_PERSON_S12'].includes(x.arrestBasis))).toBe(true);
    await (await h.as(COMMANDER)).get('/api/police/reports/s16?month=2026-13').expect(400);
    await (await h.as('prisons.national@nexcust.demo')).get(`/api/police/reports/s16?month=${month}`).expect(403);
  });
});
