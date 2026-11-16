'use client';
import { useMemo, useRef, useState } from 'react';

/**
 * Command map: Ghana's 16 regions shaded by one measure (sequential, one green hue, light → dark), with the
 * stations or establishments drawn on top. Hover or focus shows the figures; clicking a region (on the map or
 * in the ranked list, which doubles as the table view) lists its busiest units. Aggregates only, no person.
 */
export interface MapMetric { key: string; label: string; unit?: '%' }
export interface MapRegion { name: string; inScope: boolean; units: number; values: Record<string, number | null> }
export interface MapPoint { id: string; name: string; town: string | null; lat: number; lng: number; precise: boolean; region: string | null; values: Record<string, number | null>; type?: string }
export interface Projection { minLon: number; maxLat: number; k: number; kx: number; width: number; height: number; pad: number }

// Sequential ramp from the brand family (Soft Sage → Deep Forest Green); lightness falls step by step.
const RAMP = ['#DCEBDF', '#AFD2B9', '#76AE8C', '#3A8761', '#174D38'];
const NONE = '#FFFFFF', OUTSIDE = '#E6E7E2', INK = '#252525';

const fmt = (v: number | null | undefined, m: MapMetric) => (v == null ? '—' : `${v.toLocaleString()}${m.unit ?? ''}`);

function bins(max: number) {
  // Equal intervals over (0, max]; whole numbers, so every class reads as a plain range.
  const top = Math.max(1, Math.ceil(max));
  const edges = RAMP.map((_, i) => Math.ceil((top * (i + 1)) / RAMP.length));
  return { classOf: (v: number) => (v <= 0 ? -1 : Math.min(RAMP.length - 1, edges.findIndex((e) => v <= e))), edges };
}

export function GhanaMap({ shapes, projection: p, regions, points, metrics, units, attribution }: {
  shapes: Array<{ name: string; d: string; box: [number, number, number, number] }>; projection: Projection; regions: MapRegion[]; points: MapPoint[];
  metrics: MapMetric[]; units: { one: string; many: string }; attribution: string;
}) {
  const [metric, setMetric] = useState(metrics[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; lines: Array<[string, string]>; note?: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const byName = useMemo(() => new Map(regions.map((r) => [r.name, r])), [regions]);
  const max = Math.max(0, ...regions.filter((r) => r.inScope).map((r) => r.values[metric.key] ?? 0));
  const { classOf, edges } = bins(max);
  const pointMax = Math.max(1, ...points.map((pt) => pt.values[metric.key] ?? 0));
  const ranked = regions.filter((r) => r.inScope).sort((a, b) => (b.values[metric.key] ?? -1) - (a.values[metric.key] ?? -1) || a.name.localeCompare(b.name));
  const anyOutside = regions.some((r) => !r.inScope);
  const xy = (pt: MapPoint) => [p.pad + (pt.lng - p.minLon) * p.kx, p.pad + (p.maxLat - pt.lat) * p.k];
  // Zoom to the jurisdiction when it covers part of the country; the rest stays visible, hatched, for context.
  const view = useMemo(() => {
    const own = shapes.filter((sh) => byName.get(sh.name)?.inScope);
    if (!own.length || own.length === shapes.length) return { x: 0, y: 0, w: p.width, h: p.height, zoom: 1 };
    const x0 = Math.min(...own.map((sh) => sh.box[0])), y0 = Math.min(...own.map((sh) => sh.box[1])), x1 = Math.max(...own.map((sh) => sh.box[2])), y1 = Math.max(...own.map((sh) => sh.box[3]));
    const aspect = p.height / p.width; let w = (x1 - x0) * 1.35, h = (y1 - y0) * 1.35;
    if (h / w < aspect) h = w * aspect; else w = h / aspect;
    w = Math.max(w, p.width / 6); h = w * aspect;
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h, zoom: p.width / w };
  }, [shapes, byName, p]);
  const radius = (v: number | null) => (v && v > 0 ? 2.4 + 6 * Math.sqrt(v / pointMax) : 1.8) / Math.sqrt(view.zoom);
  const inRegion = selected ? points.filter((pt) => pt.region === selected).sort((a, b) => (b.values[metric.key] ?? -1) - (a.values[metric.key] ?? -1)).slice(0, 8) : [];

  const place = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(e.clientX - r.left + 14, r.width - 220), y: e.clientY - r.top + 14 };
  };
  const regionTip = (name: string, at: { x: number; y: number }) => {
    const r = byName.get(name);
    if (!r?.inScope) return setTip({ ...at, title: `${name} Region`, lines: [], note: 'Outside your jurisdiction' });
    setTip({ ...at, title: `${name} Region`, lines: [[fmt(r.values[metric.key], metric), metric.label], ...metrics.filter((m) => m.key !== metric.key).map((m) => [fmt(r.values[m.key], m), m.label] as [string, string]),
      [r.units.toLocaleString(), (r.units === 1 ? units.one : units.many).replace(/^./, (c) => c.toUpperCase())]] });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Measure" className="flex flex-wrap rounded-md border border-line bg-white p-0.5">
            {metrics.map((m) => (
              <button key={m.key} type="button" onClick={() => setMetric(m)} aria-pressed={m.key === metric.key}
                className={`rounded px-3 py-1.5 text-xs font-medium ${m.key === metric.key ? 'bg-brand text-white' : 'text-slate-600 hover:text-brand'}`}>{m.label}</button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} className="accent-[#174D38]" />Show {units.many}</label>
        </div>
        <div ref={box} className="relative" onPointerLeave={() => setTip(null)}>
          <svg viewBox={`${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`} className="mx-auto block h-auto w-full max-w-[460px]" role="img" aria-label={`Map of Ghana's regions shaded by ${metric.label.toLowerCase()}`}>
            <defs>
              <pattern id="outside" width={6 / view.zoom} height={6 / view.zoom} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={6 / view.zoom} height={6 / view.zoom} fill={OUTSIDE} /><line x1="0" y1="0" x2="0" y2={6 / view.zoom} stroke="#FFFFFF" strokeWidth={2 / view.zoom} /></pattern>
            </defs>
            {shapes.map((s) => {
              const r = byName.get(s.name); const v = r?.values[metric.key] ?? 0; const c = r?.inScope ? classOf(v ?? 0) : -2;
              const fill = c === -2 ? 'url(#outside)' : c === -1 ? NONE : RAMP[c];
              const active = selected === s.name;
              return (
                <path key={s.name} d={s.d} fill={fill} stroke={active ? INK : '#FFFFFF'} strokeWidth={active ? 2 : 1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" tabIndex={0} role="button"
                  aria-label={`${s.name} Region: ${r?.inScope ? `${fmt(r.values[metric.key], metric)} ${metric.label.toLowerCase()}` : 'outside your jurisdiction'}`} aria-pressed={active}
                  className="cursor-pointer outline-none focus-visible:stroke-[#C5A34A]" style={{ strokeWidth: active ? 2 : undefined }}
                  onPointerMove={(e) => regionTip(s.name, place(e))} onFocus={(e) => { const b = (e.target as SVGPathElement).getBBox(); const k = box.current!.clientWidth / p.width; regionTip(s.name, { x: (b.x - view.x + b.width / 2) * k * view.zoom, y: (b.y - view.y + b.height / 2) * k * view.zoom }); }}
                  onBlur={() => setTip(null)} onClick={() => setSelected(active ? null : s.name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(active ? null : s.name); } }} />
              );
            })}
            {showPoints && points.map((pt) => {
              const [x, y] = xy(pt); const v = pt.values[metric.key]; const has = (v ?? 0) > 0;
              return (
                <circle key={pt.id} cx={x} cy={y} r={radius(v)} fill={has ? (pt.precise ? INK : '#FFFFFF') : '#7D847C'} fillOpacity={has ? 0.85 : 0.55}
                  stroke={has ? (pt.precise ? '#FFFFFF' : INK) : 'none'} strokeWidth={has ? 1 : 0} vectorEffect="non-scaling-stroke"
                  onPointerMove={(e) => { e.stopPropagation(); setTip({ ...place(e), title: pt.name, lines: metrics.map((m) => [fmt(pt.values[m.key], m), m.label] as [string, string]),
                    note: `${pt.type ? `${pt.type} · ` : ''}${pt.town ?? pt.region ?? ''}${pt.precise ? '' : ' (placed at town centre)'}` }); }} />
              );
            })}
          </svg>
          {tip && (
            <div role="status" className="pointer-events-none absolute z-10 w-52 rounded-md border border-line bg-white px-3 py-2 text-xs text-ink" style={{ left: tip.x, top: tip.y }}>
              <div className="font-semibold">{tip.title}</div>
              {tip.lines.map(([v, l], i) => <div key={i} className="mt-0.5 flex justify-between gap-3"><span className="text-slate-600">{l}</span><span className={i === 0 ? 'font-semibold tabular-nums' : 'tabular-nums'}>{v}</span></div>)}
              {tip.note && <div className="mt-1 text-slate-500">{tip.note}</div>}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600" aria-label="Legend">
          <span className="font-medium text-ink">{metric.label}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded-sm border border-line" style={{ background: NONE }} />None</span>
          {RAMP.map((c, i) => {
            const lo = i === 0 ? 1 : edges[i - 1] + 1, hi = edges[i];
            return lo > hi ? null : <span key={c} className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded-sm" style={{ background: c }} />{lo === hi ? `${lo}` : `${lo}–${hi}`}{metric.unit ?? ''}</span>;
          })}
          {anyOutside && <span className="flex items-center gap-1"><svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" rx="2" fill="url(#outside)" /></svg>Outside your jurisdiction</span>}
        </div>
        {showPoints && <p className="mt-1 text-xs text-slate-500">Dots are {units.many}, sized by the measure; filled dots sit at the building, hollow ones at the town centre; small grey dots have none.</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">{metric.label} by region</h3>
        <ol className="mt-2 space-y-1">
          {ranked.map((r) => {
            const v = r.values[metric.key]; const active = selected === r.name;
            return (
              <li key={r.name}>
                <button type="button" onClick={() => setSelected(active ? null : r.name)} aria-pressed={active}
                  className={`grid w-full grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 rounded px-1.5 py-1 text-left text-xs ${active ? 'bg-sage' : 'hover:bg-white'}`}>
                  <span className="truncate">{r.name}</span>
                  <span className="h-2 rounded bg-white ring-1 ring-line"><span className="block h-2 rounded bg-chart" style={{ width: `${max && v ? Math.max(2, Math.round((v / max) * 100)) : 0}%` }} /></span>
                  <span className="text-right tabular-nums">{fmt(v, metric)}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {selected && (
          <div className="mt-4 rounded-md border border-line bg-white p-3">
            <div className="flex items-center justify-between"><h4 className="text-xs font-semibold text-ink">{selected} Region</h4><button type="button" onClick={() => setSelected(null)} className="text-xs text-brand underline underline-offset-2">Clear</button></div>
            {inRegion.length ? (
              <ol className="mt-2 space-y-1 text-xs">{inRegion.map((pt) => <li key={pt.id} className="flex justify-between gap-2"><span className="truncate">{pt.name}</span><span className="tabular-nums">{fmt(pt.values[metric.key], metric)}</span></li>)}</ol>
            ) : <p className="mt-2 text-xs text-slate-500">No mapped {units.many} in your jurisdiction here.</p>}
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{attribution}</p>
      </div>
    </div>
  );
}
