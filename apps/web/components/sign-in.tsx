'use client';
import { useState } from 'react';
import { WORKSPACE_HOME, type SessionUser } from '@nexcust/contracts';

const input = 'mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand';

/** Only a same-origin path is accepted as the place to return to after signing in. */
function returnTo(): string | null {
  const t = new URLSearchParams(window.location.search).get('to');
  if (!t || !/^\/[^/\\]/.test(t) || /[\\\u0000-\u001f]/.test(t)) return null;
  try { const u = new URL(t, window.location.origin); return u.origin === window.location.origin ? u.pathname + u.search : null; } catch { return null; }
}

export function SignInForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!res.ok) { setError(res.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Invalid email or password.'); return; }
      const user = (await res.json()) as SessionUser;
      window.location.assign(returnTo() ?? WORKSPACE_HOME[user.workspace]);
    } catch { setError('The service is unavailable. Please try again.'); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block text-sm font-medium">Email
        <input type="email" name="email" required autoFocus={autoFocus} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label className="block text-sm font-medium">Password
        <input type="password" name="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className="text-xs text-slate-500">Access is by invitation. Forgotten your password? Ask your administrator for a new link.</p>
    </form>
  );
}
