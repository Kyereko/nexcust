'use client';
import { useState } from 'react';
import { WORKSPACE_HOME, type SessionUser } from '@nexcust/contracts';
import { TAGLINE, Wordmark } from '@/components/brand';

const DEMO = [
  ['Police — National Administrator', 'police.national@nexcust.demo'], ['Police — Regional Commander (Accra)', 'police.regional@nexcust.demo'],
  ['Police — Station Commander', 'police.station@nexcust.demo'], ['Police — Records Officer', 'police.records@nexcust.demo'],
  ['Police — HR Officer', 'police.hr@nexcust.demo'], ['Police — Background Check Officer', 'police.bgcheck@nexcust.demo'],
  ['Prisons — National Administrator', 'prisons.national@nexcust.demo'], ['Prisons — Officer-in-Charge', 'prisons.superintendent@nexcust.demo'],
  ['Prisons — Records Officer', 'prisons.records@nexcust.demo'], ['Prisons — HR Officer', 'prisons.hr@nexcust.demo'],
  ['Platform Administrator', 'admin@nexcust.demo'], ['Auditor', 'auditor@nexcust.demo'], ['Public Applicant', 'applicant@nexcust.demo'],
];

export default function LoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!res.ok) { setError(res.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Invalid email or password.'); return; }
      const user = (await res.json()) as SessionUser;
      window.location.assign(WORKSPACE_HOME[user.workspace]);
    } catch { setError('The service is unavailable. Please try again.'); } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-28px)] max-w-5xl items-center gap-10 px-6 py-10 md:grid-cols-2">
      <section>
        <Wordmark size="lg" />
        <p className="mt-4 text-lg font-medium text-brand">{TAGLINE}</p>
        <p className="mt-4 max-w-md text-slate-600">Integrated police and prisons records management for Ghana — custody, personnel, registry and clearance workflows on one secure platform, with strict institution-level access control.</p>
        <div className="mt-6 h-px w-16 bg-gold" />
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Powered by Fourth IT</p>
        <p className="mt-6 max-w-md rounded-md border border-gold/40 bg-white p-3 text-xs text-slate-700">Demonstration only. NEXCUST is not an official system of the Ghana Police Service or the Ghana Prisons Service, and it holds no real records.</p>
      </section>
      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold text-brand">Sign in</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">Email
            <input type="email" name="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
          </label>
          <label className="block text-sm font-medium">Password
            <input type="password" name="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
          </label>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-6 border-t border-line pt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Demonstration accounts
            <select aria-label="Demonstration accounts" value="" onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink">
              <option value="">Choose a role to fill in the email…</option>
              {DEMO.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">The shared demo password is provided in the setup guide (README).</p>
          <p className="mt-3 text-xs"><a href="/verify" className="font-medium text-brand underline decoration-gold underline-offset-2">Verify a certificate</a> — no sign-in needed</p>
        </div>
      </section>
    </main>
  );
}
