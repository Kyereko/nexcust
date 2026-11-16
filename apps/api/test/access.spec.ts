/**
 * Security acceptance tests — run against the seeded TEST database.
 * Covers: authentication, role authorization, jurisdiction restriction, institution separation,
 * audit logging of refusals, audit immutability.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgresql://justiceone:justiceone@localhost:5432/justiceone_test?schema=public';
process.env.LOGIN_RATE_LIMIT = '1000';
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.module';

const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';
let app: INestApplication; let prisma: PrismaService;
const agents: Record<string, ReturnType<typeof request.agent>> = {};

async function as(email: string) {
  if (!agents[email]) {
    const a = request.agent(app.getHttpServer());
    await a.post('/api/auth/login').send({ email, password: PW }).expect(200);
    agents[email] = a;
  }
  return agents[email];
}
const deniedCount = (email: string) => prisma.auditEvent.count({ where: { actorEmail: email, outcome: 'DENIED' } });

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication(); configureApp(app); await app.init();
  prisma = app.get(PrismaService);
});
afterAll(async () => { await app.close(); });

describe('authentication', () => {
  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/police/custody').expect(401);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
  it('rejects a wrong password with a generic message and audits it', async () => {
    const before = await deniedCount('police.hr@justiceone.demo');
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'police.hr@justiceone.demo', password: 'wrong' }).expect(401);
    expect(res.body.message).toBe('Invalid email or password');
    expect(await deniedCount('police.hr@justiceone.demo')).toBe(before + 1);
    await prisma.user.update({ where: { email: 'police.hr@justiceone.demo' }, data: { failedLoginCount: 0, lockedUntil: null } });
  });
  it('issues an httpOnly session cookie and never exposes the password hash', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'police.records@justiceone.demo', password: PW }).expect(200);
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt/);
  });
  it('rejects state-changing requests from a foreign Origin (CSRF)', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: 'police.records@justiceone.demo', password: PW }).expect(403);
  });
  it('invalidates the session on logout', async () => {
    const a = request.agent(app.getHttpServer());
    await a.post('/api/auth/login').send({ email: 'auditor@justiceone.demo', password: PW }).expect(200);
    await a.post('/api/auth/logout').expect(204);
    await a.get('/api/auth/me').expect(401);
  });
});

describe('workspaces', () => {
  it.each([
    ['police.national@justiceone.demo', 'police'], ['prisons.national@justiceone.demo', 'prisons'], ['admin@justiceone.demo', 'admin'],
    ['auditor@justiceone.demo', 'audit'], ['applicant@justiceone.demo', 'applicant'],
  ])('%s opens the %s workspace', async (email, workspace) => {
    const res = await (await as(email)).get('/api/auth/me').expect(200);
    expect(res.body.workspace).toBe(workspace);
  });
});

describe('institution separation', () => {
  it('denies prison staff access to police records and logs the refusal', async () => {
    const email = 'prisons.records@justiceone.demo'; const before = await deniedCount(email);
    const a = await as(email);
    await a.get('/api/police/custody').expect(403);
    await a.get('/api/police/cases').expect(403);
    await a.get('/api/police/personnel').expect(403);
    expect(await deniedCount(email)).toBe(before + 3);
  });
  it('denies police staff access to prison records and logs the refusal', async () => {
    const email = 'police.national@justiceone.demo'; const before = await deniedCount(email);
    const a = await as(email);
    await a.get('/api/prisons/prisoners').expect(403);
    await a.get('/api/prisons/dashboard').expect(403);
    expect(await deniedCount(email)).toBe(before + 2);
  });
  it('gives the platform administrator no access to operational records', async () => {
    const a = await as('admin@justiceone.demo');
    await a.get('/api/police/custody').expect(403);
    await a.get('/api/prisons/prisoners').expect(403);
    await a.get('/api/persons?q=mensah').expect(403);
    await a.get('/api/admin/users').expect(200);
  });
  it('gives the public applicant no access to internal systems', async () => {
    const a = await as('applicant@justiceone.demo');
    for (const path of ['/api/persons?q=mensah', '/api/police/custody', '/api/prisons/prisoners', '/api/audit/events', '/api/admin/users']) await a.get(path).expect(403);
  });
});

describe('jurisdiction (command-tree scoping)', () => {
  it('national sees all 12 demo stations, regional 4, station officer 1', async () => {
    expect((await (await as('police.national@justiceone.demo')).get('/api/police/stations').expect(200)).body).toHaveLength(12);
    expect((await (await as('police.regional@justiceone.demo')).get('/api/police/stations').expect(200)).body).toHaveLength(4);
    expect((await (await as('police.records@justiceone.demo')).get('/api/police/stations').expect(200)).body).toHaveLength(1);
  });
  it('a station officer lists only their own station custody records', async () => {
    const res = await (await as('police.records@justiceone.demo')).get('/api/police/custody?pageSize=100').expect(200);
    const stations = new Set(res.body.items.map((i: any) => i.facility.name));
    expect(res.body.total).toBeGreaterThan(0);
    expect([...stations]).toEqual(['DEMO Accra Station 1']);
  });
  it('denies and logs a direct request for a record in another station', async () => {
    const email = 'police.records@justiceone.demo'; const before = await deniedCount(email);
    const other = await prisma.policeCustodyEpisode.findFirstOrThrow({ where: { facility: { name: 'DEMO Ashanti Station 1' } } });
    const own = await prisma.policeCustodyEpisode.findFirstOrThrow({ where: { facility: { name: 'DEMO Accra Station 1' } } });
    const a = await as(email);
    await a.get(`/api/police/custody/${other.id}`).expect(403);
    await a.get(`/api/police/custody/${own.id}`).expect(200);
    expect(await deniedCount(email)).toBe(before + 1);
    const ev = await prisma.auditEvent.findFirst({ where: { actorEmail: email, outcome: 'DENIED' }, orderBy: { occurredAt: 'desc' } });
    expect(ev).toMatchObject({ action: 'access.denied', entityId: other.id, permission: 'police.custody.read' });
  });
  it('a prison records officer sees only their own establishment; cross-prison detail is denied', async () => {
    const a = await as('prisons.records@justiceone.demo');
    const res = await a.get('/api/prisons/prisoners?pageSize=100').expect(200);
    expect([...new Set(res.body.items.map((i: any) => i.facility.name))]).toEqual(['DEMO Ashanti Central Prison']);
    const other = await prisma.prisonCustodyEpisode.findFirstOrThrow({ where: { facility: { name: 'DEMO Northern Central Prison' } } });
    await a.get(`/api/prisons/prisoners/${other.id}`).expect(403);
  });
  it('role permissions are enforced inside an institution (HR cannot read custody)', async () => {
    const a = await as('police.hr@justiceone.demo');
    await a.get('/api/police/custody').expect(403);
    await a.get('/api/police/personnel').expect(200);
  });
});

describe('data handling', () => {
  it('person index search returns identity only — no arrest, conviction or custody facts', async () => {
    const res = await (await as('prisons.records@justiceone.demo')).get('/api/persons?q=mensah').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toMatch(/arrest|convict|custody|charge/i);
  });
  it('dashboards aggregate persisted records within scope', async () => {
    const national = (await (await as('police.national@justiceone.demo')).get('/api/police/dashboard').expect(200)).body;
    const station = (await (await as('police.station@justiceone.demo')).get('/api/police/dashboard').expect(200)).body;
    expect(national.inCustody).toBe(await prisma.policeCustodyEpisode.count({ where: { status: 'IN_CUSTODY' } }));
    expect(station.inCustody).toBeLessThan(national.inCustody);
    const prisons = (await (await as('prisons.national@justiceone.demo')).get('/api/prisons/dashboard').expect(200)).body;
    expect(prisons.population).toBe(prisons.remand + prisons.convicted);
  });
  it('validates input (rejects unknown query parameters and oversized pages)', async () => {
    const a = await as('police.national@justiceone.demo');
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
    const all = (await (await as('auditor@justiceone.demo')).get('/api/audit/events?pageSize=100').expect(200)).body;
    expect(all.total).toBeGreaterThan(0);
    const police = (await (await as('police.national@justiceone.demo')).get('/api/audit/events?pageSize=100').expect(200)).body;
    expect(police.items.every((e: any) => e.institution === 'POLICE')).toBe(true);
  });
});
