/**
 * Single-series column chart (counts by period). One hue, no legend (the title names the series),
 * 4px rounded data-ends on a shared baseline, 2px gaps, recessive axis, hover/focus tooltip per
 * column with a hit target wider than the mark, and a table view for screen readers and print.
 * Mark colour: #1E7B57 (brand-family green validated for data marks; #174D38 is too dark for marks).
 */
export function BarChart({ title, data, color, max: forcedMax }: { title: string; data: Array<{ label: string; value: number }>; color: string; max?: number }) {
  const max = Math.max(1, forcedMax ?? 0, ...data.map((d) => d.value));
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <figure className="rounded-lg border border-line bg-white p-5">
      <figcaption className="text-sm font-semibold text-brand">{title}</figcaption>
      <div className="mt-4 flex h-40 items-end gap-0.5 border-b border-slate-300" aria-hidden="true">
        {data.map((d) => (
          <div key={d.label} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center px-1.5 outline-none">
            <div className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0, background: color }} />
            {d === peak && d.value > 0 && <span className="absolute text-xs font-medium tabular-nums text-slate-600" style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}>{d.value}</span>}
            <span role="tooltip" className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-brand px-2 py-1 text-xs text-white shadow group-hover:block group-focus-visible:block">
              {d.label}: <b className="tabular-nums">{d.value}</b>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 text-center text-[11px] text-slate-500" aria-hidden="true">{data.map((d) => <span key={d.label} className="flex-1">{d.label}</span>)}</div>
      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer select-none">View as table</summary>
        <table className="mt-2 w-full text-left"><thead><tr><th className="py-1 font-medium">Month</th><th className="py-1 text-right font-medium">Count</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.label} className="border-t border-slate-100"><td className="py-1">{d.label}</td><td className="py-1 text-right tabular-nums">{d.value}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

export const monthLabel = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
