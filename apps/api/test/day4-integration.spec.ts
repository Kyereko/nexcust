/** Day 4 — background checks (Workflow C), certificate verification, authorized exchange, reports. */
import request from 'supertest';
import { startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const APPLICANT = 'applicant@justiceone.demo', BGC = 'police.bgcheck@justiceone.demo', APPROVER = 'police.national@justiceone.demo';
const POLICE_REC = 'police.records@justiceone.demo', PRISON_REC = 'prisons.records@justiceone.demo';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;

beforeAll(async () => { h = await startApp(); });
afterAll(async () => { await h.app.close(); });

async function application(personWithConviction: boolean) {
  const conv = await h.prisma.convictionRecord.findFirstOrThrow({ include: { person: { include: { identifiers: true } } } });
  const clean = await h.prisma.person.findFirstOrThrow({ where: { convictions: { none: {} }, identifiers: { some: { type: 'GHANA_CARD' } } }, include: { identifiers: true } });
  const p = personWithConviction ? conv.person : clean;
  const card = p.identifiers.find((i) => i.type === 'GHANA_CARD');
  return { person: p, body: { fullName: `${p.otherNames} ${p.surname}`, dateOfBirth: p.dateOfBirth!.toISOString().slice(0, 10), identifierType: 'GHANA_CARD',
    identifierValue: card?.value ?? `DEMO-GHA-X${uniq()}`, purpose: 'Employment (test)' } };
}
async function process(id: string, personId: string | undefined) {
  const o = await h.as(BGC);
  await o.post(`/api/police/background-checks/${id}/advance`).send({ stage: 'VALIDATED', note: 'Application complete' }).expect(201);
  await o.post(`/api/police/background-checks/${id}/advance`).send({ stage: 'IDENTITY_VERIFIED', note: 'Identity verified at appointment (demo)', personId }).expect(201);
  const searched = (await o.post(`/api/police/background-checks/${id}/advance`).send({ stage: 'RECORDS_SEARCHED', note: 'Records searched' }).expect(201)).body;
  await o.post(`/api/police/background-checks/${id}/advance`).send({ stage: 'UNDER_REVIEW', note: 'Recommend issue' }).expect(201);
  return searched;
}

describe('Workflow C — background check to verifiable certificate', () => {
  let appId: string, code: string;
  it('applicant submits; cannot submit a duplicate; sees only their own applications', async () => {
    const { body } = await application(false); const a = await h.as(APPLICANT);
    const res = (await a.post('/api/applicant/background-checks').send(body).expect(201)).body;
    appId = res.id; expect(res).toMatchObject({ status: 'SUBMITTED' }); expect(res.reference).toMatch(/^DEMO-BGC-/);
    await a.post('/api/applicant/background-checks').send(body).expect(409);
    expect((await a.get('/api/applicant/background-checks').expect(200)).body.map((x: any) => x.id)).toContain(appId);
    await a.get(`/api/police/background-checks/${appId}`).expect(403); // no internal access
  });
  it('enforces the stage order and the officer\'s permissions', async () => {
    const o = await h.as(BGC);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ stage: 'RECORDS_SEARCHED', note: 'skip ahead' }).expect(409);
    await (await h.as(POLICE_REC)).post(`/api/police/background-checks/${appId}/advance`).send({ stage: 'VALIDATED', note: 'not my role' }).expect(403);
  });
  it('officer validates, verifies identity against an index candidate, searches and sends for decision', async () => {
    const o = await h.as(BGC);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ stage: 'VALIDATED', note: 'Application complete' }).expect(201);
    const detail = (await o.get(`/api/police/background-checks/${appId}`).expect(200)).body;
    expect(detail.candidates.length).toBeGreaterThan(0);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ stage: 'IDENTITY_VERIFIED', note: 'Ghana Card checked (demo)', personId: detail.candidates[0].id }).expect(201);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ stage: 'RECORDS_SEARCHED', note: 'Search complete' }).expect(201);
    const review = await h.prisma.backgroundCheckReview.findFirstOrThrow({ where: { applicationId: appId, stage: 'RECORDS_SEARCHED' } });
    expect((review.findings as any).convictions).toEqual([]);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ stage: 'UNDER_REVIEW', note: 'Recommend issue' }).expect(201);
    await o.post(`/api/police/background-checks/${appId}/decision`).send({ decision: 'APPROVE', note: 'No record' }).expect(403); // reviewer lacks approval permission
  });
  it('a different, authorized officer approves and a certificate is issued', async () => {
    const cert = (await (await h.as(APPROVER)).post(`/api/police/background-checks/${appId}/decision`).send({ decision: 'APPROVE', note: 'No conviction recorded (demonstration)' }).expect(201)).body;
    code = cert.verificationCode; expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/); expect(cert.certificateNumber).toMatch(/^DEMO-PCC-/);
    const mine = (await (await h.as(APPLICANT)).get(`/api/applicant/background-checks/${appId}`).expect(200)).body;
    expect(mine.status).toBe('CERTIFICATE_ISSUED'); expect(mine.certificate.verificationCode).toBe(code);
    expect(JSON.stringify(mine)).not.toMatch(/findings|reviews|personId/); // applicant never sees internal working
  });
  it('anyone holding the code can verify authenticity without signing in; wrong codes fail', async () => {
    const pub = request(h.app.getHttpServer());
    const ok = (await pub.get(`/api/verify/${code.toLowerCase().replace(/-/g, '')}`).expect(200)).body;
    expect(ok).toMatchObject({ valid: true, status: 'VALID', resultSummary: 'No conviction recorded (demonstration)', demonstration: true });
    expect((await pub.get('/api/verify/AAAA-BBBB-CCCC').expect(200)).body.valid).toBe(false);
    await pub.get('/api/verify/short').expect(400);
  });
  it('the search discloses court-recorded convictions only, and the reviewer cannot also decide', async () => {
    const { person, body } = await application(true);
    const id = (await (await h.as(APPLICANT)).post('/api/applicant/background-checks').send({ ...body, identifierValue: `${body.identifierValue}` }).expect(201)).body.id;
    await process(id, person.id);
    const f = (await h.prisma.backgroundCheckReview.findFirstOrThrow({ where: { applicationId: id, stage: 'RECORDS_SEARCHED' } })).findings as any;
    expect(f.convictions.length).toBeGreaterThan(0); expect(JSON.stringify(f)).not.toMatch(/arrest|custody|charge/i);
    await (await h.as(APPROVER)).post(`/api/police/background-checks/${id}/decision`).send({ decision: 'REJECT', note: 'Refer applicant to records unit (test)' }).expect(201);
    expect((await h.prisma.backgroundCheckApplication.findUniqueOrThrow({ where: { id } })).status).toBe('REJECTED');
  });
});

describe('authorized exchange between institutions', () => {
  it('a prison records officer obtains a minimal police custody summary; the request is logged with its purpose', async () => {
    const ep = await h.prisma.policeCustodyEpisode.findFirstOrThrow({ where: { status: 'REMANDED_TO_PRISON' } });
    const a = await h.as(PRISON_REC);
    const r = (await a.post('/api/exchange/requests').send({ personId: ep.personId, providingInstitution: 'POLICE', purpose: 'Verify police remand before admission (test)', legalBasis: 'Remand warrant (demo)' }).expect(201)).body;
    expect(r.disclosedSummary.kind).toBe('POLICE_CUSTODY_SUMMARY');
    expect(r.disclosedSummary.episodes.some((e: any) => e.status === 'REMANDED_TO_PRISON')).toBe(true);
    expect(JSON.stringify(r.disclosedSummary)).not.toMatch(/suspectedOffence|legalAuthority|dispositionNote|cell/i);
    await a.get(`/api/exchange/requests/${r.id}`).expect(200);
    await (await h.as(POLICE_REC)).get(`/api/exchange/requests/${r.id}`).expect(404); // only the requester re-reads the answer
    expect(await h.prisma.auditEvent.count({ where: { action: 'exchange.request', entityId: r.id } })).toBe(1);
  });
  it('police can ask prisons; nobody can "exchange" with their own institution; purpose is mandatory', async () => {
    const held = await h.prisma.prisonCustodyEpisode.findFirstOrThrow({ where: { status: 'IN_CUSTODY' }, include: { prisonerRecord: true } });
    const p = await h.as(POLICE_REC);
    const r = (await p.post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'PRISONS', purpose: 'Locate suspect for investigation (test)', legalBasis: 'Active case (demo)' }).expect(201)).body;
    expect(r.disclosedSummary.currentlyInPrisonCustody).toBe(true); expect(JSON.stringify(r.disclosedSummary)).not.toMatch(/sentence|offence/i);
    await p.post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'POLICE', purpose: 'Own institution request', legalBasis: 'n/a basis' }).expect(400);
    await p.post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'PRISONS', purpose: '', legalBasis: '' }).expect(400);
    await (await h.as('police.hr@justiceone.demo')).post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'PRISONS', purpose: 'HR is not entitled to ask', legalBasis: 'none given' }).expect(403);
  });
});

describe('reports', () => {
  it('police national report rolls up by regional command and matches the database', async () => {
    const r = (await (await h.as(APPROVER)).get('/api/police/reports').expect(200)).body;
    expect(r.rows.map((x: any) => x.name)).toEqual(expect.arrayContaining(['Accra Regional Police Command', 'Ashanti Regional Police Command', 'Northern Regional Police Command']));
    expect(r.total.inCustody).toBe(await h.prisma.policeCustodyEpisode.count({ where: { status: 'IN_CUSTODY' } }));
    expect(r.arrestsByMonth).toHaveLength(6);
  });
  it('regional and station users get only their own roll-up', async () => {
    expect((await (await h.as('police.regional@justiceone.demo')).get('/api/police/reports').expect(200)).body.rows.map((x: any) => x.name)).toEqual(['Accra Regional Police Command']);
    expect((await (await h.as('police.station@justiceone.demo')).get('/api/police/reports').expect(200)).body.rows.map((x: any) => x.name)).toEqual(['DEMO Accra Station 1']);
  });
  it('prisons national report totals equal the dashboard population', async () => {
    const a = await h.as('prisons.national@justiceone.demo');
    const [rep, dash] = await Promise.all([a.get('/api/prisons/reports').expect(200), a.get('/api/prisons/dashboard').expect(200)]);
    expect(rep.body.total.population).toBe(dash.body.population); expect(rep.body.rows).toHaveLength(3);
    await (await h.as(POLICE_REC)).get('/api/prisons/reports').expect(403);
  });
});
