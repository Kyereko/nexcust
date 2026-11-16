'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TAGLINE, Wordmark } from '@/components/brand';
import { ParticleBackdrop } from '@/components/particles';
import { SignInForm } from '@/components/sign-in';

const MODULES = [
  { title: 'Police', points: ['Arrests and custody under the Criminal and Other Offences (Procedure) Act: arrest basis, rights, 48-hour review, bail bonds, search and property', 'Cases and investigations linked to the people and custody episodes they concern', 'Personnel and postings with commander approval', 'Police clearance from application to authorised signature, with public certificate verification'] },
  { title: 'Prisons', points: ['Admissions on the committal warrant, with the gaoler’s receipt', 'Remand warrants tracked to their return dates, with renewals and alerts', 'Transfers and releases that need a second officer’s approval; remission and forfeiture', 'Establishments, housing and occupancy; rehabilitation programmes'] },
  { title: 'Shared', points: ['One national person index used by both services', 'Purpose-bound requests between Police and Prisons, disclosing only a minimal summary', 'Juvenile identities protected under the Juvenile Justice Act, 2003', 'An audit trail that cannot be edited or deleted'] },
];

const CONTROLS = [
  ['Jurisdiction', 'Every officer works within their command: station, district, division, region or national. Queries are limited to it on the server, not just hidden on screen.'],
  ['Two officers, not one', 'Custody disposals, postings, transfers, releases and clearances are initiated by one officer and approved by another. Nobody approves their own request.'],
  ['Every refusal recorded', 'Each sign-in, change and refused attempt is written to an append-only audit trail that oversight roles can search.'],
  ['People decide', 'Detention, guilt, sentence and release are recorded from a named officer’s decision. The system never computes them.'],
] as const;

export function Landing() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const show = () => { dialog.current?.showModal(); setOpen(true); };
  const hide = () => { dialog.current?.close(); };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('signin') || window.location.hash === '#signin') show();
    const d = dialog.current; const onClose = () => setOpen(false);
    d?.addEventListener('close', onClose);
    return () => d?.removeEventListener('close', onClose);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="NEXCUST home"><Wordmark size="sm" /></Link>
          <nav className="ml-auto hidden gap-6 text-sm sm:flex" aria-label="Sections">
            <a href="#platform" className="hover:text-brand">Platform</a><a href="#controls" className="hover:text-brand">Controls</a><Link href="/verify" className="hover:text-brand">Verify a certificate</Link>
          </nav>
          <button type="button" onClick={show} className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover sm:ml-0">Sign in</button>
        </div>
      </header>

      <section className="relative h-[min(760px,calc(100vh-64px))] min-h-[560px] overflow-hidden border-b border-line">
        {!open && <ParticleBackdrop fixed={false} y={0.3} size={0.24} max={2400} />}
        <div className="pointer-events-none absolute inset-x-0 top-[48%] z-10 mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-brand sm:text-5xl">{TAGLINE}</h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-slate-600 sm:text-lg">One secure records platform for police custody, investigations, prisons and criminal record clearance in Ghana.</p>
          <div className="pointer-events-auto mt-7 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={show} className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">Sign in to NEXCUST</button>
            <a href="#platform" className="rounded-md border border-brand/30 bg-white px-5 py-2.5 text-sm font-medium text-brand hover:bg-sage">See what it covers</a>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">The platform</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-brand sm:text-3xl">Two services, one trusted record of every person in custody</h2>
        <div className="mt-2 h-px w-16 bg-gold" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.title} className="rounded-lg border border-line bg-surface p-6">
              <h3 className="text-lg font-semibold text-brand">{m.title}</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-700">{m.points.map((p) => <li key={p} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-chart" />{p}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="controls" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Accountability by design</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-brand sm:text-3xl">Controls that hold up under review</h2>
          <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {CONTROLS.map(([t, d]) => <div key={t} className="border-l-2 border-gold pl-4"><dt className="font-semibold text-ink">{t}</dt><dd className="mt-1 text-sm text-slate-600">{d}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold text-brand">Have an invitation?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">Open the link in your email to choose your password, then sign in here. Holders of a NEXCUST clearance certificate can check it without an account.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={show} className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">Sign in</button>
          <Link href="/verify" className="rounded-md border border-brand/30 bg-white px-5 py-2.5 text-sm font-medium text-brand hover:bg-sage">Verify a certificate</Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6">
          <span>NEXCUST · {TAGLINE} · Powered by Fourth IT</span>
          <span>Prototype with synthetic records. Not an official system of the Ghana Police Service or the Ghana Prisons Service.</span>
        </div>
      </footer>

      <dialog ref={dialog} aria-labelledby="signin-title" className="m-0 h-full max-h-none w-full max-w-none bg-canvas p-0 text-ink backdrop:bg-canvas">
        {open && <ParticleBackdrop fixed={false} y={0.2} size={0.17} />}
        <button type="button" onClick={hide} aria-label="Close" className="absolute right-4 top-4 z-20 rounded-md border border-line bg-white px-3 py-1 text-lg leading-none text-brand hover:bg-sage">&times;</button>
        <div className="relative z-10 grid min-h-full place-items-end justify-items-center px-4 pb-[max(24px,7vh)] pt-[34vh] max-sm:place-items-center max-sm:pt-[30vh]">
          <section className="w-full max-w-sm rounded-xl border border-line bg-white/90 p-6 backdrop-blur-sm">
            <h2 id="signin-title" className="mb-4 text-lg font-semibold text-brand">Sign in</h2>
            {open && <SignInForm autoFocus />}
          </section>
        </div>
      </dialog>
    </div>
  );
}
