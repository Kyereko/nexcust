'use client';
import { useEffect, useState } from 'react';
import { WORKSPACE_HOME, type SessionUser } from '@nexcust/contracts';
import { Wordmark } from '@/components/brand';
import { ParticleBackdrop } from '@/components/particles';

interface Preview { email: string; displayName: string; accessName: string; accessDescription: string }

const input = 'mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand';

/** Invitation link target. The token arrives in the URL fragment, which browsers never send to a server. */
export default function AcceptInvitation() {
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(''); const [again, setAgain] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('token');
    // Drop the token from the address bar and history as soon as it has been read.
    history.replaceState(null, '', window.location.pathname);
    if (!t) { setError('This invitation link is incomplete. Open the link from your email again, or ask for a new one.'); return; }
    setToken(t);
    fetch('/api/auth/invitation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (r.ok) setPreview(d); else setError(r.status === 429 ? 'Too many attempts. Wait a minute and reload this page.' : d.message ?? 'This invitation cannot be used.'); })
      .catch(() => setError('The service is unavailable. Please try again shortly.'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 12) return setError('Choose a password of at least 12 characters.');
    if (password !== again) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/invitation/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(Array.isArray(d.message) ? d.message.join(' ') : d.message ?? 'Could not set your password.'); return; }
      window.location.assign(WORKSPACE_HOME[(d as SessionUser).workspace]);
    } catch { setError('The service is unavailable. Please try again.'); } finally { setBusy(false); }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-10">
      <ParticleBackdrop y={0.2} size={0.16} />
      <section className="relative z-10 w-full max-w-md rounded-xl border border-line bg-white/90 p-7 backdrop-blur-sm">
        <Wordmark size="sm" />
        <h1 className="mt-5 text-xl font-semibold text-brand">Accept your invitation</h1>
        {preview ? (
          <>
            <p className="mt-2 text-sm text-slate-600">Welcome, <span className="font-medium text-ink">{preview.displayName}</span>. Choose a password to activate your account (<span className="font-medium text-ink">{preview.email}</span>).</p>
            <p className="mt-3 rounded-md bg-sage px-3 py-2 text-xs text-brand"><span className="font-semibold">{preview.accessName}.</span> {preview.accessDescription}</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium">New password
                <input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
                <span className="mt-1 block text-xs font-normal text-slate-500">At least 12 characters. A phrase of several words works well.</span>
              </label>
              <label className="block text-sm font-medium">Repeat password
                <input type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={input} />
              </label>
              {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">{busy ? 'Activating…' : 'Save password and sign in'}</button>
            </form>
          </>
        ) : error ? (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : (
          <p className="mt-4 text-sm text-slate-500" role="status">Checking your invitation…</p>
        )}
        <p className="mt-6 text-xs text-slate-500">Already activated? <a href="/login" className="font-medium text-brand underline decoration-gold underline-offset-2">Sign in</a></p>
      </section>
    </main>
  );
}
