import { fmtDate } from '@/lib/api';
import { TAGLINE, Wordmark } from '@/components/brand';

/** Printable sample certificate. Watermarked: a demonstration artefact, not a valid document. */
export function Certificate({ c, holder, dob, purpose }: { c: any; holder: string; dob: string; purpose: string }) {
  const verifyPath = `/verify/${c.verificationCode}`;
  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-brand bg-white p-8 print:border-black">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-4xl font-black tracking-widest text-red-600/10 [transform:rotate(-20deg)] sm:text-5xl">DEMONSTRATION — NOT VALID</div>
      <div className="text-center">
        <Wordmark size="md" /><div className="mt-1 text-[11px] tracking-[0.2em] text-slate-500">{TAGLINE.toUpperCase()} · DEMONSTRATION</div>
        <h2 className="mt-3 text-2xl font-semibold text-brand">Police Clearance Certificate (sample)</h2>
        <p className="mt-1 text-xs text-slate-500">Not issued by the Ghana Police Service. Generated from synthetic data for demonstration.</p>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Certificate no.</dt><dd className="font-medium">{c.certificateNumber}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt><dd className="font-medium">{c.status}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Holder</dt><dd className="font-medium">{holder}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Date of birth</dt><dd>{fmtDate(dob)}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Purpose</dt><dd>{purpose}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Issued / valid until</dt><dd>{fmtDate(c.issuedAt)} – {fmtDate(c.expiresAt)}</dd></div>
        <div className="col-span-2"><dt className="text-xs uppercase tracking-wide text-slate-500">Result (as approved by the issuing officer)</dt><dd className="font-medium">{c.resultSummary}</dd></div>
      </dl>
      <div className="mt-6 rounded-md border-l-2 border-gold bg-sage p-4 text-sm">
        Verification code <span className="font-mono text-base font-semibold tracking-wider">{c.verificationCode}</span>
        <div className="mt-1 text-xs text-slate-600">Check authenticity at <a className="underline" href={verifyPath}>{verifyPath}</a></div>
      </div>
    </div>
  );
}
