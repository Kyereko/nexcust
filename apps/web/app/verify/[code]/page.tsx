import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { headers } from 'next/headers';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default async function VerifyResult({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
  const res = await fetch(`${API}/api/verify/${encodeURIComponent(code)}`, { cache: 'no-store', headers: ip ? { 'x-forwarded-for': ip } : {} });
  const r = res.ok ? await res.json() : { valid: false, message: res.status === 429 ? 'Too many checks. Please wait a minute and try again.' : 'Enter the 12-character verification code printed on the certificate.' };
  const found = 'certificateNumber' in r;
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Wordmark size="md" /><div className="mt-1 text-xs tracking-[0.2em] text-slate-500">DEMONSTRATION</div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand">Certificate verification</h1>
      <div role="status" className={`mt-6 rounded-lg border p-5 ${r.valid ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
        <div className={`text-lg font-semibold ${r.valid ? 'text-emerald-900' : 'text-red-900'}`}>{r.valid ? '✓ Authentic and valid (demonstration certificate)' : found ? `✕ Certificate ${r.status?.toLowerCase()}` : '✕ Not verified'}</div>
        {!found && <p className="mt-1 text-sm text-red-900">{r.message}</p>}
        {found && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs uppercase text-slate-500">Certificate no.</dt><dd className="font-medium">{r.certificateNumber}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Status</dt><dd className="font-medium">{r.status}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Holder</dt><dd>{r.holderName}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Date of birth</dt><dd>{d(r.dateOfBirth)}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Issued</dt><dd>{d(r.issuedAt)}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Valid until</dt><dd>{d(r.expiresAt)}</dd></div>
            <div className="col-span-2"><dt className="text-xs uppercase text-slate-500">Result</dt><dd>{r.resultSummary}</dd></div>
          </dl>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">This prototype holds synthetic data only. A real police clearance certificate can only be verified through the Ghana Police Service.</p>
      <Link href="/verify" className="mt-6 inline-block text-sm underline">Verify another code</Link>
    </main>
  );
}
