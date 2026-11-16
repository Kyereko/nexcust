import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@justiceone/contracts';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'j1_session';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Server-side call to the API, forwarding the caller's session cookie. Authorization is decided by the API, never here. */
export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/api${path}`, { headers: await forwarded(), cache: 'no-store' });
  if (res.status === 401) redirect('/login');
  // The API has already refused and audited the request; show a clear, non-leaky page.
  if (res.status === 403) redirect('/access-denied');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * Headers for a server-side API call: the caller's session cookie plus their real client IP,
 * so the API's rate limiting and audit trail see the end user rather than the web server.
 */
async function forwarded(): Promise<Record<string, string>> {
  const token = (await cookies()).get(COOKIE)?.value;
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
  return { ...(token ? { cookie: `${COOKIE}=${token}` } : {}), ...(ip ? { 'x-forwarded-for': ip } : {}) };
}

export interface SendResult<T> { ok: boolean; status: number; data: T | null; message: string; code?: string }

/** State-changing call from a server action. Never throws on a refusal: the caller shows the message. */
export async function send<T = any>(method: 'POST' | 'PATCH', path: string, body?: unknown): Promise<SendResult<T>> {
  const res = await fetch(`${API}/api${path}`, { method, headers: { ...(await forwarded()), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  if (res.status === 401) redirect('/login');
  const data = await res.json().catch(() => null);
  const raw = data?.message;
  const message = res.ok ? '' : res.status === 403 ? (typeof raw === 'string' ? raw : 'You are not authorized to perform this action') : Array.isArray(raw) ? raw.join('; ') : (raw ?? `Request failed (${res.status})`);
  return { ok: res.ok, status: res.status, data: res.ok ? data : null, message, code: data?.code };
}

/** Memoised per request (layout + page share one lookup). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const h = await forwarded();
  if (!h.cookie) return null;
  const res = await fetch(`${API}/api/auth/me`, { headers: h, cache: 'no-store' });
  return res.ok ? ((await res.json()) as SessionUser) : null;
});

export const qs = (params: Record<string, string | undefined>) => {
  const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && u.set(k, v)); const s = u.toString(); return s ? `?${s}` : '';
};
export const fmtDateTime = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Accra', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
