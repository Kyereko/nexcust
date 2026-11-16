'use client';
import { useState } from 'react';
import { WORKSPACE_HOME, type SessionUser } from '@justiceone/contracts';

const DEMO = [
  ['Police — National Administrator', 'police.national@justiceone.demo'], ['Police — Regional Commander (Accra)', 'police.regional@justiceone.demo'],
  ['Police — Station Commander', 'police.station@justiceone.demo'], ['Police — Records Officer', 'police.records@justiceone.demo'],
  ['Police — HR Officer', 'police.hr@justiceone.demo'], ['Police — Background Check Officer', 'police.bgcheck@justiceone.demo'],
  ['Prisons — National Administrator', 'prisons.national@justiceone.demo'], ['Prisons — Officer-in-Charge', 'prisons.superintendent@justiceone.demo'],
  ['Prisons — Records Officer', 'prisons.records@justiceone.demo'], ['Prisons — HR Officer', 'prisons.hr@justiceone.demo'],
  ['Platform Administrator', 'admin@justiceone.demo'], ['Auditor', 'auditor@justiceone.demo'], ['Public Applicant', 'applicant@justiceone.demo'],
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
        <div className="text-sm font-semibold tracking-widest text-slate-500">FOURTH IT</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">JusticeOne <span className="text-slate-400">Ghana</span></h1>
        <p className="mt-4 text-slate-600">Integrated police and prisons records management — a working prototype built on synthetic data to demonstrate custody, personnel and registry workflows with institution-level access control.</p>
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Demonstration only. This is not an official system of the Ghana Police Service or the Ghana Prisons Service, and it holds no real records.</p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">Email
            <input type="email" name="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600" />
          </label>
          <label className="block text-sm font-medium">Password
            <input type="password" name="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600" />
          </label>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Demonstration accounts
            <select aria-label="Demonstration accounts" value="" onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900">
              <option value="">Choose a role to fill in the email…</option>
              {DEMO.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">The shared demo password is provided in the setup guide (README).</p>
        </div>
      </section>
    </main>
  );
}
