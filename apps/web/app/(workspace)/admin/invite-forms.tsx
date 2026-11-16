'use client';
import { useActionState, useState } from 'react';
import { invite, resend, type LinkState } from './actions';
import { inputCls } from '@/components/ui';

function IssuedLink({ state }: { state: LinkState }) {
  const [copied, setCopied] = useState(false);
  if (!state.ok) return <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.message}</p>;
  return (
    <div role="status" className={`mt-3 rounded-md border px-3 py-3 text-sm ${state.emailed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <p>{state.message}</p>
      {state.link && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded border border-line bg-white px-2 py-1 text-xs text-ink">{state.link}</code>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(state.link!); setCopied(true); }}
            className="rounded-md border border-brand/30 bg-white px-3 py-1 text-xs font-medium text-brand hover:bg-sage">{copied ? 'Copied' : 'Copy link'}</button>
        </div>
      )}
      <p className="mt-2 text-xs opacity-80">The link works once and expires in 72 hours. It is shown only now.</p>
    </div>
  );
}

export function InviteForm({ profiles }: { profiles: Array<{ code: string; name: string; description: string }> }) {
  const [state, action, pending] = useActionState(invite, null);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="block text-sm font-medium text-slate-700">Full name<input name="displayName" required minLength={2} maxLength={120} autoComplete="off" className={inputCls} /></label>
      <label className="block text-sm font-medium text-slate-700">Email<input name="email" type="email" required maxLength={200} autoComplete="off" className={inputCls} /></label>
      <input type="hidden" name="access" value={profiles[0]?.code ?? 'TESTER'} />
      <button disabled={pending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">{pending ? 'Sending…' : 'Send invitation'}</button>
      <p className="text-xs text-slate-500 md:col-span-3"><span className="font-medium text-slate-700">{profiles[0]?.name}:</span> {profiles[0]?.description} A full approval cycle needs two testers, because nobody can approve their own request.</p>
      {state && <div className="md:col-span-3"><IssuedLink state={state} /></div>}
    </form>
  );
}

export function ResendButton({ id, email }: { id: string; email: string }) {
  const [state, action, pending] = useActionState(resend, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="email" value={email} />
      <button disabled={pending} className="text-xs font-medium text-brand underline decoration-gold underline-offset-2 disabled:opacity-60">{pending ? 'Sending…' : 'Send a new link'}</button>
      {state && <IssuedLink state={state} />}
    </form>
  );
}
