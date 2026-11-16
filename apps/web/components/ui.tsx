import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'alert' }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${tone === 'alert' ? 'text-red-700' : ''}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200', amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-800 ring-red-200', blue: 'bg-blue-50 text-blue-800 ring-blue-200', slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};
const STATUS_TONE: Record<string, string> = {
  IN_CUSTODY: 'amber', IN_TRANSIT: 'blue', RELEASED: 'green', RELEASED_ON_BAIL: 'green', RELEASED_NO_CHARGE: 'green', REMANDED_TO_PRISON: 'blue',
  TRANSFERRED_TO_COURT: 'blue', OPEN: 'amber', UNDER_INVESTIGATION: 'amber', BEFORE_COURT: 'blue', CLOSED: 'slate', ACTIVE: 'green',
  SUCCESS: 'green', DENIED: 'red', FAILURE: 'red', VERIFIED: 'green', PROVISIONAL: 'amber', UNCONFIRMED: 'red', REMAND: 'amber', CONVICTED: 'slate',
};
export function Badge({ children, tone }: { children: string; tone?: string }) {
  const t = TONES[tone ?? STATUS_TONE[children] ?? 'slate'];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${t}`}>{children.replace(/_/g, ' ')}</span>;
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&_td]:px-4 [&_td]:py-2.5">{children}</tbody>
      </table>
      {empty && <div className="p-8 text-center text-sm text-slate-500">No records found within your jurisdiction.</div>}
    </Card>
  );
}

export function SearchBar({ q, placeholder, statuses, status }: { q?: string; placeholder: string; statuses?: string[]; status?: string }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2" method="get">
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label="Search" className="w-72 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500" />
      {statuses && (
        <select name="status" defaultValue={status ?? ''} aria-label="Status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      )}
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Search</button>
    </form>
  );
}

export function Pager({ total, page, pageSize, base, params }: { total: number; page: number; pageSize: number; base: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => { const u = new URLSearchParams(); Object.entries({ ...params, page: String(p) }).forEach(([k, v]) => v && u.set(k, v)); return `${base}?${u}`; };
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
      <span>{total.toLocaleString()} record{total === 1 ? '' : 's'} · page {page} of {pages}</span>
      <span className="flex gap-2">
        {page > 1 && <Link className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="rounded border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50" href={href(page + 1)}>Next</Link>}
      </span>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 text-sm">{children}</dd></div>;
}

export function Planned({ title, day, scope }: { title: string; day: string; scope: string }) {
  return (
    <Card className="p-8">
      <Badge tone="blue">{`Scheduled · ${day}`}</Badge>
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{scope}</p>
      <p className="mt-4 text-xs text-slate-500">The data model and API contract for this module are already in place; the workflow screens are on the sprint backlog (docs/03-agent-execution-plan.md).</p>
    </Card>
  );
}

/** Result banner driven by ?error= / ?notice= so server actions need no client state. */
export function Flash({ sp }: { sp: Record<string, string | undefined> }) {
  if (sp.error) return <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{sp.error}</p>;
  if (sp.notice) return <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sp.notice}</p>;
  return null;
}

export const inputCls = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-600';
export function Label({ text, children, hint }: { text: string; children: ReactNode; hint?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{text}{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
}
export function Button({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'secondary' | 'danger' }) {
  const cls = { primary: 'bg-slate-900 text-white hover:bg-slate-700', secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50', danger: 'bg-red-700 text-white hover:bg-red-600' }[tone];
  return <button type="submit" className={`rounded-md px-4 py-2 text-sm font-medium ${cls}`}>{children}</button>;
}
export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} prefetch={false} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">{children}</Link>;
}
