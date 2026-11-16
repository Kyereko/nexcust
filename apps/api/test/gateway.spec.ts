/** Hosted-mode protections: the API answers only through the web tier, and rate limits track the real client. */
import request from 'supertest';
import { PW, startApp } from './harness';

let h: Awaited<ReturnType<typeof startApp>>;
const SECRET = 'test-gateway-secret-0123456789';
beforeAll(async () => { h = await startApp(); process.env.API_GATEWAY_SECRET = SECRET; });
afterAll(async () => { delete process.env.API_GATEWAY_SECRET; await h.app.close(); });

it('returns a bare 404 to any request without the gateway secret, including public routes', async () => {
  const s = request(h.app.getHttpServer());
  await s.get('/api/health').expect(404);
  await s.get('/api/verify/AAAA-BBBB-CCCC').expect(404);
  await s.post('/api/auth/login').send({ email: 'auditor@nexcust.fourthit.com', password: PW }).expect(404);
  await s.get('/api/health').set('x-nexcust-gateway', 'wrong-secret-of-same-length-xx').expect(404);
});

it('serves requests that carry the secret', async () => {
  await request(h.app.getHttpServer()).get('/api/health').set('x-nexcust-gateway', SECRET).expect(200);
});

it('records the forwarded client IP in the audit trail only for gateway-verified requests', async () => {
  await request(h.app.getHttpServer()).post('/api/auth/login').set('x-nexcust-gateway', SECRET).set('x-nexcust-client-ip', '203.0.113.77')
    .send({ email: 'auditor@nexcust.fourthit.com', password: PW }).expect(200);
  const ev = await h.prisma.auditEvent.findFirst({ where: { action: 'auth.login', actorEmail: 'auditor@nexcust.fourthit.com' }, orderBy: { occurredAt: 'desc' } });
  expect(ev?.ipAddress).toBe('203.0.113.77');
});
