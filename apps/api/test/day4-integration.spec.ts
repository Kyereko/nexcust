/** Day 4 — background checks (Workflow C), certificate verification, authorized exchange, reports. */
import request from 'supertest';
import { startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const APPLICANT = 'applicant@nexcust.fourthit.com', BGC = 'police.bgcheck@nexcust.fourthit.com', APPROVER = 'police.national@nexcust.fourthit.com';
const POLICE_REC = 'police.records@nexcust.fourthit.com', PRISON_REC = 'prisons.records@nexcust.fourthit.com';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;

beforeAll(async () => { h = await startApp(); });
afterAll(async () => { await h.app.close(); });

async function application(personWithConviction: boolean) {
  const conv = await h.prisma.convictionRecord.findFirstOrThrow({ include: { person: { include: { identifiers: true } } } });
  const clean = await h.prisma.person.findFirstOrThrow({ where: { convictions: { none: {} }, identifiers: { some: { type: 'GHANA_CARD' } } }, include: { identifiers: true } });
  const p = personWithConviction ? conv.person : clean;
  const card = p.identifiers.find((i) => i.type === 'GHANA_CARD');
  return { person: p, body: { fullName: `${p.otherNames} ${p.surname}`, dateOfBirth: p.dateOfBirth!.toISOString().slice(0, 10), identifierType: 'GHANA_CARD',
    identifierValue: `${card?.value ?? 'GHA-NXX'}-${uniq()}`, purpose: 'Employment (test)', serviceTypeCode: 'ORDINARY_RESIDENT', residenceAttested: true, deliveryPostOffice: 'Accra Central Post Office' } };
}
const appointment = { appointmentAt: new Date(Date.now() + 86400_000).toISOString(), captureCentre: 'CID Headquarters capture centre' };
/** Officer steps up to the records search; returns after RECORDS_SEARCHED. */
async function processTo(id: string, personId: string | undefined, ident: 'IDENT' | 'NOT_IDENT' | 'NOT_RECORDED') {
  const o = await h.as(BGC); const step = (body: object) => o.post(`/api/police/background-checks/${id}/advance`).send({ note: 'Step recorded (test)', ...body }).expect(201);
  await step({ paymentRef: `NX-PAY-${uniq()}` });
  await step(appointment);
  await step({ personId });
  return (await step({ criminalIdent: ident })).body;
}

describe('Workflow C — police clearance on the eServices portal flow', () => {
  let appId: string, code: string;
  it('applicant chooses an available service, attests residence and gives a delivery post office; sees fees; cannot pick an unavailable service', async () => {
    const { body } = await application(false); const a = await h.as(APPLICANT);
    const types = (await a.get('/api/applicant/background-checks/service-types').expect(200)).body;
    expect(types.find((t: any) => t.code === 'ORDINARY_RESIDENT')).toMatchObject({ vettingFeeGhs: 150, addOnFeeGhs: 70, available: true });
    await a.post('/api/applicant/background-checks').send({ ...body, serviceTypeCode: 'ADOPTION' }).expect(400);
    await a.post('/api/applicant/background-checks').send({ ...body, residenceAttested: false }).expect(400);
    const res = (await a.post('/api/applicant/background-checks').send(body).expect(201)).body;
    appId = res.id; expect(res).toMatchObject({ status: 'SUBMITTED' }); expect(res.serviceType.name).toMatch(/Ordinary Vetting/);
    await a.post('/api/applicant/background-checks').send(body).expect(409);
    await a.get(`/api/police/background-checks/${appId}`).expect(403);
  });
  it('officer records payment, appointment and attendance (fingerprints), then the criminal-ident result', async () => {
    const o = await h.as(BGC);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'no ref' }).expect(400); // payment reference required
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'Paid on Ghana.gov (test)', paymentRef: 'NX-PAY-1' }).expect(201);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'Booked', ...appointment }).expect(201);
    const detail = (await o.get(`/api/police/background-checks/${appId}`).expect(200)).body;
    expect(detail.nextStage).toBe('BIOMETRICS_CAPTURED');
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'Attended; live-scan prints taken ', personId: detail.candidates[0]?.id }).expect(201);
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'Search done' }).expect(400); // ident result required
    const searched = (await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'CDSB search done', criminalIdent: 'NOT_IDENT' }).expect(201)).body;
    expect(searched).toMatchObject({ status: 'RECORDS_SEARCHED', criminalIdent: 'NOT_IDENT' });
    await o.post(`/api/police/background-checks/${appId}/advance`).send({ note: 'Ready for signature' }).expect(201);
    expect((await h.prisma.backgroundCheckApplication.findUniqueOrThrow({ where: { id: appId } })).status).toBe('UNDER_REVIEW');
    await o.post(`/api/police/background-checks/${appId}/decision`).send({ decision: 'APPROVE' }).expect(403); // reviewer lacks signing permission
  });
  it('an authorised signatory signs for the Director-General, CID; published wording; validity six calendar months', async () => {
    const cert = (await (await h.as(APPROVER)).post(`/api/police/background-checks/${appId}/decision`).send({ decision: 'APPROVE' }).expect(201)).body;
    code = cert.verificationCode; expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(cert.resultSummary).toBe('The applicant does not appear in the criminal records of the Ghana Police Service.');
    expect(cert.signsFor).toBe('Director-General, CID');
    const issued = new Date(cert.issuedAt), exp = new Date(cert.expiresAt); const m = (exp.getUTCFullYear() - issued.getUTCFullYear()) * 12 + exp.getUTCMonth() - issued.getUTCMonth();
    expect(m).toBe(6);
    const mine = (await (await h.as(APPLICANT)).get(`/api/applicant/background-checks/${appId}`).expect(200)).body;
    expect(mine.status).toBe('CERTIFICATE_ISSUED'); expect(JSON.stringify(mine)).not.toMatch(/findings|reviews|personId|criminalIdent/);
  });
  it('dispatches via Ghana Post; anyone with the code can verify authenticity', async () => {
    await (await h.as(BGC)).post(`/api/police/background-checks/${appId}/dispatch`).send({ deliveryPostOffice: 'Accra Central Post Office', parcelBatchNo: 'NX-BATCH-001' }).expect(201);
    expect((await (await h.as(APPLICANT)).get(`/api/applicant/background-checks/${appId}`).expect(200)).body).toMatchObject({ status: 'DISPATCHED', parcelBatchNo: 'NX-BATCH-001' });
    const pub = request(h.app.getHttpServer());
    expect((await pub.get(`/api/verify/${code.toLowerCase().replace(/-/g, '')}`).expect(200)).body).toMatchObject({ valid: true, signsFor: 'Director-General, CID', specimen: true });
    expect((await pub.get('/api/verify/AAAA-BBBB-CCCC').expect(200)).body.valid).toBe(false);
    await pub.get('/api/verify/short').expect(400);
  });
  it('an IDENT result goes to investigation; the signatory must word the result; the system never generates adverse wording', async () => {
    const { person, body } = await application(true);
    const id = (await (await h.as(APPLICANT)).post('/api/applicant/background-checks').send(body).expect(201)).body.id;
    await processTo(id, person.id, 'IDENT');
    const o = await h.as(BGC);
    expect((await o.get(`/api/police/background-checks/${id}`).expect(200)).body.convictions.length).toBeGreaterThan(0); // supporting evidence only
    await o.post(`/api/police/background-checks/${id}/advance`).send({ note: 'Referred for investigation' }).expect(201);
    expect((await h.prisma.backgroundCheckApplication.findUniqueOrThrow({ where: { id } })).status).toBe('UNDER_INVESTIGATION');
    await o.post(`/api/police/background-checks/${id}/advance`).send({ note: 'Investigation complete' }).expect(201);
    const s = await h.as(APPROVER);
    await s.post(`/api/police/background-checks/${id}/decision`).send({ decision: 'APPROVE' }).expect(400);
    await s.post(`/api/police/background-checks/${id}/decision`).send({ decision: 'REJECT', note: 'Refer applicant to CID records unit (test)' }).expect(201);
  });
  it('additional information can be requested and processing resumes where it stopped', async () => {
    const { body } = await application(false);
    const id = (await (await h.as(APPLICANT)).post('/api/applicant/background-checks').send(body).expect(201)).body.id;
    const o = await h.as(BGC);
    await o.post(`/api/police/background-checks/${id}/advance`).send({ note: 'Paid', paymentRef: 'NX-PAY-2' }).expect(201);
    await o.post(`/api/police/background-checks/${id}/request-info`).send({ note: 'Upload a clearer passport photo (test)' }).expect(201);
    expect((await (await h.as(APPLICANT)).get(`/api/applicant/background-checks/${id}`).expect(200)).body.status).toBe('ADDITIONAL_INFO_REQUESTED');
    await o.post(`/api/police/background-checks/${id}/advance`).send({ note: 'Information received' }).expect(201);
    expect((await h.prisma.backgroundCheckApplication.findUniqueOrThrow({ where: { id } })).status).toBe('PAYMENT_CONFIRMED');
  });
  it('only an officer on the signatory register can sign', async () => {
    const signer = await h.prisma.user.findUniqueOrThrow({ where: { email: APPROVER } });
    await h.prisma.authorisedSignatory.update({ where: { userId: signer.id }, data: { active: false } });
    try {
      const { person, body } = await application(false);
      const id = (await (await h.as(APPLICANT)).post('/api/applicant/background-checks').send(body).expect(201)).body.id;
      await processTo(id, person.id, 'NOT_RECORDED');
      await (await h.as(BGC)).post(`/api/police/background-checks/${id}/advance`).send({ note: 'Ready' }).expect(201);
      await (await h.as(APPROVER)).post(`/api/police/background-checks/${id}/decision`).send({ decision: 'APPROVE' }).expect(403);
    } finally { await h.prisma.authorisedSignatory.update({ where: { userId: signer.id }, data: { active: true } }); }
  });
});

describe('authorized exchange between institutions', () => {
  it('a prison records officer obtains a minimal police custody summary; the request is logged with its purpose', async () => {
    const ep = await h.prisma.policeCustodyEpisode.findFirstOrThrow({ where: { status: 'REMANDED_TO_PRISON' } });
    const a = await h.as(PRISON_REC);
    const r = (await a.post('/api/exchange/requests').send({ personId: ep.personId, providingInstitution: 'POLICE', purpose: 'Verify police remand before admission (test)', legalBasis: 'Remand warrant ' }).expect(201)).body;
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
    const r = (await p.post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'PRISONS', purpose: 'Locate suspect for investigation (test)', legalBasis: 'Active case ' }).expect(201)).body;
    expect(r.disclosedSummary.currentlyInPrisonCustody).toBe(true); expect(JSON.stringify(r.disclosedSummary)).not.toMatch(/sentence|offence/i);
    await p.post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'POLICE', purpose: 'Own institution request', legalBasis: 'n/a basis' }).expect(400);
    await p.post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'PRISONS', purpose: '', legalBasis: '' }).expect(400);
    await (await h.as('police.hr@nexcust.fourthit.com')).post('/api/exchange/requests').send({ personId: held.prisonerRecord.personId, providingInstitution: 'PRISONS', purpose: 'HR is not entitled to ask', legalBasis: 'none given' }).expect(403);
  });
});

describe('reports', () => {
  it('police national report rolls up by regional command and matches the database', async () => {
    const r = (await (await h.as(APPROVER)).get('/api/police/reports').expect(200)).body;
    expect(r.rows.map((x: any) => x.name)).toEqual(expect.arrayContaining(['Accra Regional Police Command', 'Ashanti Regional Police Command', 'Northern Regional Police Command']));
    expect(r.total.inCustody).toBe(await h.prisma.policeCustodyEpisode.count({ where: { status: 'IN_CUSTODY' } }));
    expect(r.arrestsByMonth).toHaveLength(6);
    expect(r.total.personnel + r.personnelOutsideCommands).toBe((await (await h.as(APPROVER)).get('/api/police/dashboard').expect(200)).body.personnel);
  });
  it('regional and station users get only their own roll-up', async () => {
    expect((await (await h.as('police.regional@nexcust.fourthit.com')).get('/api/police/reports').expect(200)).body.rows.map((x: any) => x.name)).toEqual(['Accra Regional Police Command']);
    expect((await (await h.as('police.station@nexcust.fourthit.com')).get('/api/police/reports').expect(200)).body.rows.map((x: any) => x.name)).toEqual(['Nima Police Station']);
  });
  it('prisons national report totals equal the dashboard population', async () => {
    const a = await h.as('prisons.national@nexcust.fourthit.com');
    const [rep, dash] = await Promise.all([a.get('/api/prisons/reports').expect(200), a.get('/api/prisons/dashboard').expect(200)]);
    expect(rep.body.total.population).toBe(dash.body.population);
    expect(rep.body.rows).toHaveLength(await h.prisma.organizationalUnit.count({ where: { institution: { code: 'PRISONS' }, type: { code: 'REGIONAL_COMMAND' } } }));
    await (await h.as(POLICE_REC)).get('/api/prisons/reports').expect(403);
  });
});
