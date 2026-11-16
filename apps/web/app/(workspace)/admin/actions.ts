'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { send } from '@/lib/api';

const s = (f: FormData, k: string) => { const v = f.get(k); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };

export interface LinkState { ok: boolean; message: string; link?: string; emailed?: boolean }

const issued = (r: Awaited<ReturnType<typeof send>>, to: string): LinkState => {
  if (!r.ok) return { ok: false, message: r.message };
  const d = r.data as { link: string; emailed: boolean; emailReason: string | null };
  revalidatePath('/admin');
  return d.emailed
    ? { ok: true, emailed: true, link: d.link, message: `Invitation emailed to ${to}. The link below is the same one, in case you prefer to send it yourself.` }
    : { ok: true, emailed: false, link: d.link, message: `The invitation was created but not emailed. ${d.emailReason ?? 'Email is unavailable.'} Copy the link below and send it to ${to} yourself.` };
};

/** Creates an invitation. The link is returned to this page once and never placed in a URL. */
export async function invite(_prev: LinkState | null, f: FormData): Promise<LinkState> {
  const email = s(f, 'email');
  const r = await send('POST', '/admin/invitations', { email, displayName: s(f, 'displayName'), access: s(f, 'access') });
  return issued(r, email ?? 'them');
}

export async function resend(_prev: LinkState | null, f: FormData): Promise<LinkState> {
  const r = await send('POST', `/admin/invitations/${s(f, 'id')}/resend`);
  return issued(r, s(f, 'email') ?? 'them');
}

export async function revoke(f: FormData) {
  const r = await send('POST', `/admin/invitations/${s(f, 'id')}/revoke`);
  redirect(`/admin?${new URLSearchParams(r.ok ? { notice: `Invitation for ${s(f, 'email')} withdrawn. Its link no longer works.` } : { error: r.message })}`);
}

export async function setStatus(f: FormData) {
  const status = s(f, 'status');
  const r = await send('POST', `/admin/users/${s(f, 'id')}/status`, { status });
  redirect(`/admin?${new URLSearchParams(r.ok ? { notice: status === 'SUSPENDED' ? `${s(f, 'email')} suspended and signed out.` : `${s(f, 'email')} can sign in again.` } : { error: r.message })}`);
}
