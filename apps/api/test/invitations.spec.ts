/** Invitations and the Tester access profile: everything operational, nothing administrative. */
import request from 'supertest';
import { startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const ADMIN = 'admin@nexcust.demo', NATIONAL = 'police.national@nexcust.demo';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const tokenOf = (link: string) => link.split('#token=')[1];
const PASSWORD = 'correct horse battery staple';

async function invite(email = `tester.${uniq()}@example.org`) {
  const res = await (await h.as(ADMIN)).post('/api/admin/invitations').send({ email, displayName: 'Ama Tester', access: 'TESTER' }).expect(201);
  return { ...res.body, email, token: tokenOf(res.body.link) };
}

beforeAll(async () => { h = await startApp(); });
afterAll(async () => { await h.app.close(); });

describe('creating invitations', () => {
  it('returns a single-use link, records the email outcome and audits the action', async () => {
    const inv = await invite();
    expect(inv.link).toMatch(/\/accept#token=[\w-]{40,}$/);
    expect(inv.emailStatus).toBe('NOT_CONFIGURED'); // no email service in tests: the administrator copies the link
    const row = await h.prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(row.tokenHash).not.toContain(inv.token); // only the hash is stored
    expect(await h.prisma.auditEvent.count({ where: { action: 'admin.invitation.create', entityId: inv.id, outcome: 'SUCCESS' } })).toBe(1);
  });
  it('refuses a second open invitation and an email that already has an account', async () => {
    const inv = await invite();
    await (await h.as(ADMIN)).post('/api/admin/invitations').send({ email: inv.email, displayName: 'Again', access: 'TESTER' }).expect(409);
    await (await h.as(ADMIN)).post('/api/admin/invitations').send({ email: NATIONAL, displayName: 'Taken', access: 'TESTER' }).expect(409);
  });
  it('is administrators only, and the refusal is audited', async () => {
    const before = await h.denied(NATIONAL);
    await (await h.as(NATIONAL)).post('/api/admin/invitations').send({ email: `x.${uniq()}@example.org`, displayName: 'X', access: 'TESTER' }).expect(403);
    await (await h.as(NATIONAL)).get('/api/admin/invitations').expect(403);
    expect(await h.denied(NATIONAL)).toBe(before + 2);
  });
  it('rejects an unknown access profile', async () => {
    await (await h.as(ADMIN)).post('/api/admin/invitations').send({ email: `y.${uniq()}@example.org`, displayName: 'Y', access: 'PLATFORM_ADMIN' }).expect(400);
  });
});

describe('accepting an invitation', () => {
  it('previews, then creates a Tester with Police, Prisons and applicant access but no administration', async () => {
    const inv = await invite();
    const anon = request.agent(h.app.getHttpServer());
    const preview = (await anon.post('/api/auth/invitation').send({ token: inv.token }).expect(200)).body;
    expect(preview).toMatchObject({ email: inv.email, displayName: 'Ama Tester', accessName: 'Tester' });
    await anon.post('/api/auth/invitation/accept').send({ token: inv.token, password: 'short' }).expect(400);
    const user = (await anon.post('/api/auth/invitation/accept').send({ token: inv.token, password: PASSWORD }).expect(200)).body;
    expect(user.workspaces).toEqual(['police', 'prisons', 'applicant']);
    expect(user.workspace).toBe('police');
    expect(user.permissions).toEqual(expect.arrayContaining(['police.custody.write', 'police.bgcheck.approve', 'prisons.release.approve', 'audit.read', 'applicant.bgcheck.submit']));
    expect(user.permissions).not.toContain('platform.users.manage');
    expect(user.permissions).not.toContain('platform.config.manage');
    expect(user.permissions).not.toContain('police.juvenile.read');
    // The session is live: operational reads work nationally in both institutions, administration is refused.
    await anon.get('/api/police/custody').expect(200);
    await anon.get('/api/prisons/prisoners').expect(200);
    await anon.get('/api/admin/users').expect(403);
    // The account signs in normally afterwards.
    await request(h.app.getHttpServer()).post('/api/auth/login').send({ email: inv.email, password: PASSWORD }).expect(200);
    const row = await h.prisma.invitation.findUniqueOrThrow({ where: { id: inv.id } });
    expect(row.acceptedAt).not.toBeNull(); expect(row.userId).toBe(user.id);
  });
  it('works once only', async () => {
    const inv = await invite();
    await request(h.app.getHttpServer()).post('/api/auth/invitation/accept').send({ token: inv.token, password: PASSWORD }).expect(200);
    await request(h.app.getHttpServer()).post('/api/auth/invitation/accept').send({ token: inv.token, password: PASSWORD }).expect(400);
    await request(h.app.getHttpServer()).post('/api/auth/invitation').send({ token: inv.token }).expect(400);
  });
  it('stops working when revoked, and a resend replaces the old link', async () => {
    const a = await invite();
    await (await h.as(ADMIN)).post(`/api/admin/invitations/${a.id}/revoke`).expect(200);
    await request(h.app.getHttpServer()).post('/api/auth/invitation').send({ token: a.token }).expect(400);
    await (await h.as(ADMIN)).post(`/api/admin/invitations/${a.id}/resend`).expect(409);

    const b = await invite();
    const again = (await (await h.as(ADMIN)).post(`/api/admin/invitations/${b.id}/resend`).expect(200)).body;
    await request(h.app.getHttpServer()).post('/api/auth/invitation').send({ token: b.token }).expect(400);
    await request(h.app.getHttpServer()).post('/api/auth/invitation').send({ token: tokenOf(again.link) }).expect(200);
  });
  it('refuses an expired link', async () => {
    const inv = await invite();
    await h.prisma.invitation.update({ where: { id: inv.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await request(h.app.getHttpServer()).post('/api/auth/invitation/accept').send({ token: inv.token, password: PASSWORD }).expect(400);
    const list = (await (await h.as(ADMIN)).get(`/api/admin/invitations?q=${encodeURIComponent(inv.email)}`).expect(200)).body;
    expect(list.items[0].state).toBe('EXPIRED');
  });
});

describe('maker–checker still binds a tester', () => {
  it('a tester cannot approve a transfer they initiated', async () => {
    const inv = await invite();
    const t = request.agent(h.app.getHttpServer());
    await t.post('/api/auth/invitation/accept').send({ token: inv.token, password: PASSWORD }).expect(200);
    const prisons = await h.prisma.facility.findMany({ where: { orgUnit: { institution: { code: 'PRISONS' } }, housingUnits: { some: {} } }, include: { housingUnits: true }, take: 2 });
    const personId = (await t.post('/api/persons').send({ surname: `Tester${uniq()}`, otherNames: 'Kofi', sex: 'MALE' }).expect(201)).body.id;
    const day = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
    const episodeId = (await t.post('/api/prisons/admissions').send({ personId, facilityId: prisons[0].id, housingUnitId: prisons[0].housingUnits[0].id, warrantType: 'REMAND_COMMITMENT_FOR_TRIAL',
      court: 'Circuit Court A (test)', warrantRef: `WRT-T${uniq()}`, warrantIssuedAt: day(0), returnDate: day(10), escortingOfficer: 'Sgt. Escort (test)', conditionAtHandover: 'Sober, no visible injuries' }).expect(201)).body.episode.id;
    const tr = (await t.post('/api/prisons/transfers').send({ episodeId, toFacilityId: prisons[1].id, reason: 'Tester maker–checker check' }).expect(201)).body;
    const ap = await t.post(`/api/prisons/transfers/${tr.id}/approve`); expect(ap.status).toBe(409); expect(ap.body.message).toMatch(/maker–checker/);
  });
});

describe('account status', () => {
  it('suspension ends the account’s sessions; administrators cannot suspend themselves', async () => {
    const inv = await invite();
    const t = request.agent(h.app.getHttpServer());
    const user = (await t.post('/api/auth/invitation/accept').send({ token: inv.token, password: PASSWORD }).expect(200)).body;
    await (await h.as(ADMIN)).post(`/api/admin/users/${user.id}/status`).send({ status: 'SUSPENDED' }).expect(200);
    await t.get('/api/auth/me').expect(401);
    await request(h.app.getHttpServer()).post('/api/auth/login').send({ email: inv.email, password: PASSWORD }).expect(401);
    await (await h.as(ADMIN)).post(`/api/admin/users/${user.id}/status`).send({ status: 'ACTIVE' }).expect(200);
    await request(h.app.getHttpServer()).post('/api/auth/login').send({ email: inv.email, password: PASSWORD }).expect(200);
    const me = (await (await h.as(ADMIN)).get('/api/auth/me').expect(200)).body;
    await (await h.as(ADMIN)).post(`/api/admin/users/${me.id}/status`).send({ status: 'SUSPENDED' }).expect(400);
  });
});
