/**
 * Security acceptance tests — run against the seeded TEST database.
 * Covers: authentication, role authorization, jurisdiction restriction, institution separation,
 * audit logging of refusals, audit immutability.
 */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { PW, startApp } from './harness';
import type { PrismaService } from '../src/prisma/prisma.module';

let app: INestApplication; let prisma: PrismaService;
let as: Awaited<ReturnType<typeof startApp>>['as'];
const deniedCount = (email: string) => prisma.auditEvent.count({ where: { actorEmail: email, outcome: 'DENIED' } });

beforeAll(async () => { ({ app, prisma, as } = await startApp()); });
afterAll(async () => { await app.close(); });

describe('authentication', () => {
  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/police/custody').expect(401);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
  it('rejects a wrong password with a generic message and audits it', async () => {
    const before = await deniedCount('police.hr@nexcust.fourthit.com');
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'police.hr@nexcust.fourthit.com', password: 'wrong' }).expect(401);
    expect(res.body.message).toBe('Invalid email or password');
    expect(await deniedCount('police.hr@nexcust.fourthit.com')).toBe(before + 1);
    await prisma.user.update({ where: { email: 'police.hr@nexcust.fourthit.com' }, data: { failedLoginCount: 0, lockedUntil: null } });
  });
  it('issues an httpOnly session cookie and never exposes the password hash', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'police.records@nexcust.fourthit.com', password: PW }).expect(200);
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt/);
  });
  it('rejects state-changing requests from a foreign Origin (CSRF)', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: 'police.records@nexcust.fourthit.com', password: PW }).expect(403);
  });
  it('invalidates the session on logout', async () => {
    const a = request.agent(app.getHttpServer());
    await a.post('/api/auth/login').send({ email: 'auditor@nexcust.fourthit.com', password: PW }).expect(200);
    await a.post('/api/auth/logout').expect(204);
    await a.get('/api/auth/me').expect(401);
  });
});

describe('workspaces', () => {
  it.each([
    ['police.national@nexcust.fourthit.com', 'police'], ['prisons.national@nexcust.fourthit.com', 'prisons'], ['admin@nexcust.fourthit.com', 'admin'],
    ['auditor@nexcust.fourthit.com', 'audit'], ['applicant@nexcust.fourthit.com', 'applicant'],
  ])('%s opens the %s workspace', async (email, workspace) => {
    const res = await (await as(email)).get('/api/auth/me').expect(200);
    expect(res.body.workspace).toBe(workspace);
  });
});

describe('institution separation', () => {
  it('denies prison staff access to police records and logs the refusal', async () => {
    const email = 'prisons.records@nexcust.fourthit.com'; const before = await deniedCount(email);
    const a = await as(email);
    await a.get('/api/police/custody').expect(403);
    await a.get('/api/police/cases').expect(403);
    await a.get('/api/police/personnel').expect(403);
    expect(await deniedCount(email)).toBe(before + 3);
  });
  it('denies police staff access to prison records and logs the refusal', async () => {
    const email = 'police.national@nexcust.fourthit.com'; const before = await deniedCount(email);
    const a = await as(email);
    await a.get('/api/prisons/prisoners').expect(403);
    await a.get('/api/prisons/dashboard').expect(403);
    expect(await deniedCount(email)).toBe(before + 2);
  });
  it('gives the platform administrator no access to operational records', async () => {
    const a = await as('admin@nexcust.fourthit.com');
    await a.get('/api/police/custody').expect(403);
    await a.get('/api/prisons/prisoners').expect(403);
    await a.get('/api/persons?q=mensah').expect(403);
    await a.get('/api/admin/users').expect(200);
  });
  it('gives the public applicant no access to internal systems', async () => {
    const a = await as('applicant@nexcust.fourthit.com');
    for (const path of ['/api/persons?q=mensah', '/api/police/custody', '/api/prisons/prisoners', '/api/audit/events', '/api/admin/users']) await a.get(path).expect(403);
  });
});

describe('jurisdiction (command-tree scoping)', () => {
  it('national sees every station and post, the Accra regional commander only Accra Region, a station officer one', async () => {
    const all = await prisma.facility.count({ where: { institution: { code: 'POLICE' } } });
    const accra = await prisma.organizationalUnit.findFirstOrThrow({ where: { code: 'GPS-R-ACCRA' } });
    const inAccra = await prisma.facility.count({ where: { orgUnit: { path: { startsWith: accra.path } } } });
    expect(all).toBeGreaterThan(900); expect(inAccra).toBeGreaterThan(100); expect(inAccra).toBeLessThan(all);
    expect((await (await as('police.national@nexcust.fourthit.com')).get('/api/police/stations').expect(200)).body).toHaveLength(all);
    expect((await (await as('police.regional@nexcust.fourthit.com')).get('/api/police/stations').expect(200)).body).toHaveLength(inAccra);
    expect((await (await as('police.records@nexcust.fourthit.com')).get('/api/police/stations').expect(200)).body).toHaveLength(1);
  });
  it('the station directory is paginated, searchable and never widens the caller\'s scope', async () => {
    const national = (await (await as('police.national@nexcust.fourthit.com')).get('/api/police/stations/directory?pageSize=10').expect(200)).body;
    expect(national.items).toHaveLength(10); expect(national.total).toBeGreaterThan(900); expect(national.commands.length).toBe(25);
    const nima = (await (await as('police.national@nexcust.fourthit.com')).get('/api/police/stations/directory?q=nima').expect(200)).body;
    expect(nima.items.map((i: any) => i.name)).toContain('Nima Police Station');
    expect(nima.items.find((i: any) => i.name === 'Nima Police Station')).toMatchObject({ command: 'Accra Regional Police Command', status: 'VERIFIED' });
    const ashanti = national.commands.find((c: any) => c.name.startsWith('Ashanti Regional'));
    const regional = (await (await as('police.regional@nexcust.fourthit.com')).get(`/api/police/stations/directory?command=${encodeURIComponent(ashanti.path)}`).expect(200)).body;
    expect(regional.total).toBe(0); // another region's command filter cannot reach outside Accra
    const own = (await (await as('police.records@nexcust.fourthit.com')).get('/api/police/stations/directory').expect(200)).body;
    expect(own.items.map((i: any) => i.name)).toEqual(['Nima Police Station']);
  });
  it('a station officer lists only their own station custody records', async () => {
    const res = await (await as('police.records@nexcust.fourthit.com')).get('/api/police/custody?pageSize=100').expect(200);
    const stations = new Set(res.body.items.map((i: any) => i.facility.name));
    expect(res.body.total).toBeGreaterThan(0);
    expect([...stations]).toEqual(['Nima Police Station']);
  });
  it('denies and logs a direct request for a record in another station', async () => {
    const email = 'police.records@nexcust.fourthit.com'; const before = await deniedCount(email);
    const other = await prisma.policeCustodyEpisode.findFirstOrThrow({ where: { facility: { name: 'Manhyia Police Station' } } });
    const own = await prisma.policeCustodyEpisode.findFirstOrThrow({ where: { facility: { name: 'Nima Police Station' } } });
    const a = await as(email);
    await a.get(`/api/police/custody/${other.id}`).expect(403);
    await a.get(`/api/police/custody/${own.id}`).expect(200);
    expect(await deniedCount(email)).toBe(before + 1);
    const ev = await prisma.auditEvent.findFirst({ where: { actorEmail: email, outcome: 'DENIED' }, orderBy: { occurredAt: 'desc' } });
    expect(ev).toMatchObject({ action: 'access.denied', entityId: other.id, permission: 'police.custody.read' });
  });
  it('a prison records officer sees only their own establishment; cross-prison detail is denied', async () => {
    const a = await as('prisons.records@nexcust.fourthit.com');
    const res = await a.get('/api/prisons/prisoners?pageSize=100').expect(200);
    expect([...new Set(res.body.items.map((i: any) => i.facility.name))]).toEqual(['Kumasi Central Prison']);
    const other = await prisma.prisonCustodyEpisode.findFirstOrThrow({ where: { facility: { name: 'Tamale Central Prison' } } });
    await a.get(`/api/prisons/prisoners/${other.id}`).expect(403);
  });
  it('role permissions are enforced inside an institution (HR cannot read custody)', async () => {
    const a = await as('police.hr@nexcust.fourthit.com');
    await a.get('/api/police/custody').expect(403);
    await a.get('/api/police/personnel').expect(200);
  });
});

describe('data handling', () => {
  it('person index search returns identity only — no arrest, conviction or custody facts', async () => {
    const res = await (await as('prisons.records@nexcust.fourthit.com')).get('/api/persons?q=mensah').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toMatch(/arrest|convict|custody|charge/i);
  });
  it('dashboards aggregate persisted records within scope', async () => {
    const national = (await (await as('police.national@nexcust.fourthit.com')).get('/api/police/dashboard').expect(200)).body;
    const station = (await (await as('police.station@nexcust.fourthit.com')).get('/api/police/dashboard').expect(200)).body;
    expect(national.inCustody).toBe(await prisma.policeCustodyEpisode.count({ where: { status: 'IN_CUSTODY' } }));
    expect(station.inCustody).toBeLessThan(national.inCustody);
    const prisons = (await (await as('prisons.national@nexcust.fourthit.com')).get('/api/prisons/dashboard').expect(200)).body;
    expect(prisons.population).toBe(prisons.remand + prisons.convicted);
  });
  it('map figures add up to the dashboard and follow the caller\'s jurisdiction', async () => {
    const sum = (m: any, k: string) => m.regions.reduce((n: number, r: any) => n + (r.values[k] ?? 0), 0);
    const nat = (await (await as('police.national@nexcust.fourthit.com')).get('/api/police/map').expect(200)).body;
    const natDash = (await (await as('police.national@nexcust.fourthit.com')).get('/api/police/dashboard').expect(200)).body;
    expect(nat.regions).toHaveLength(16); expect(nat.regions.every((r: any) => r.inScope)).toBe(true);
    expect(sum(nat, 'inCustody')).toBe(natDash.inCustody); expect(sum(nat, 'arrests30d')).toBe(natDash.arrests30d);
    expect(nat.points.length + nat.unmapped).toBe(natDash.stations);
    expect(JSON.stringify(nat)).not.toMatch(/surname|otherNames|indexNumber/);
    const reg = (await (await as('police.regional@nexcust.fourthit.com')).get('/api/police/map').expect(200)).body;
    expect(reg.regions.filter((r: any) => r.inScope).map((r: any) => r.name)).toEqual(['Greater Accra']);
    expect(reg.points.every((p: any) => p.region === 'Greater Accra')).toBe(true);
    const pri = (await (await as('prisons.national@nexcust.fourthit.com')).get('/api/prisons/map').expect(200)).body;
    const priDash = (await (await as('prisons.national@nexcust.fourthit.com')).get('/api/prisons/dashboard').expect(200)).body;
    expect(sum(pri, 'population')).toBe(priDash.population);
    await (await as('police.hr@nexcust.fourthit.com')).get('/api/prisons/map').expect(403);
  });
  it('validates input (rejects unknown query parameters and oversized pages)', async () => {
    const a = await as('police.national@nexcust.fourthit.com');
    await a.get('/api/police/custody?pageSize=5000').expect(400);
    await a.get('/api/police/custody?drop=table').expect(400);
  });
});

describe('audit trail', () => {
  it('is append-only at the database level', async () => {
    const ev = await prisma.auditEvent.findFirstOrThrow();
    await expect(prisma.auditEvent.update({ where: { id: ev.id }, data: { action: 'tampered' } })).rejects.toThrow(/append-only/);
    await expect(prisma.auditEvent.delete({ where: { id: ev.id } })).rejects.toThrow(/append-only/);
  });
  it('auditor reads all events; institutional admin reads only their institution', async () => {
    const all = (await (await as('auditor@nexcust.fourthit.com')).get('/api/audit/events?pageSize=100').expect(200)).body;
    expect(all.total).toBeGreaterThan(0);
    const police = (await (await as('police.national@nexcust.fourthit.com')).get('/api/audit/events?pageSize=100').expect(200)).body;
    expect(police.items.every((e: any) => e.institution === 'POLICE')).toBe(true);
  });
});
