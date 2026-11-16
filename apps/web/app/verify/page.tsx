import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand';

async function go(f: FormData) {
  'use server';
  const code = String(f.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  redirect(`/verify/${code || 'missing'}`);
}

export default function VerifyForm() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Wordmark size="md" /><div className="mt-1 text-xs tracking-[0.2em] text-slate-500">DEMONSTRATION</div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand">Verify a certificate</h1>
      <p className="mt-3 text-sm text-slate-600">Enter the 12-character verification code printed on a sample police clearance certificate. No sign-in is needed.</p>
      <form action={go} className="mt-6 flex gap-2">
        <input name="code" required aria-label="Verification code" placeholder="XXXX-XXXX-XXXX" className="flex-1 rounded-md border border-line bg-white px-3 py-2 font-mono uppercase tracking-wider outline-none focus:border-brand" />
        <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">Verify</button>
      </form>
    </main>
  );
}
