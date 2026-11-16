import { NextResponse, type NextRequest } from 'next/server';

/**
 * 1. Optional site-wide password gate: active only when DEMO_GATE_ENABLED=true and DEMO_GATE_PASSWORD is set
 *    (HTTP Basic credentials in addition to NEXCUST's own sign-in). Off by default.
 * 2. API proxy: /api/* is forwarded to the API with the gateway secret and the real client IP, so the
 *    browser only ever talks to this origin (first-party session cookie, no CORS surface).
 */
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

function gateOk(req: NextRequest): boolean {
  const password = process.env.DEMO_GATE_PASSWORD;
  if (process.env.DEMO_GATE_ENABLED !== 'true' || !password) return true;
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch { return false; }
  const sep = decoded.indexOf(':');
  const user = decoded.slice(0, sep); const pass = decoded.slice(sep + 1);
  const expectedUser = process.env.DEMO_GATE_USER || 'nexcust';
  // length-independent comparison to avoid trivial timing leaks
  const a = `${user}\u0000${pass}`; const b = `${expectedUser}\u0000${password}`;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  if (!gateOk(req)) {
    return new NextResponse('NEXCUST demonstration — authorized viewers only.', {
      status: 401, headers: { 'WWW-Authenticate': 'Basic realm="NEXCUST demonstration", charset="UTF-8"', 'Cache-Control': 'no-store' },
    });
  }
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const target = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, API);
    const headers = new Headers(req.headers);
    headers.delete('authorization'); // the demo-gate credentials stay at the edge
    headers.set('x-nexcust-client-ip', req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown');
    if (process.env.API_GATEWAY_SECRET) headers.set('x-nexcust-gateway', process.env.API_GATEWAY_SECRET);
    return NextResponse.rewrite(target, { request: { headers } });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|icon.svg|favicon.ico).*)'] };
