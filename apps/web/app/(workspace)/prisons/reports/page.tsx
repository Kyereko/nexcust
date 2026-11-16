import { api, fmtDateTime } from '@/lib/api';
import { BarChart, monthLabel } from '@/components/bar-chart';
import { PageHeader, Table } from '@/components/ui';

export default async function PrisonsReports() {
  const r = await api<any>('/prisons/reports');
  const cols: Array<[string, string]> = [['establishments', 'Establishments'], ['capacity', 'Capacity'], ['population', 'Population'], ['occupancyRate', 'Occupancy'], ['remand', 'Remand'], ['convicted', 'Convicted'],
    ['admissions30d', 'Admissions (30 d)'], ['releases30d', 'Releases (30 d)'], ['transfersIn30d', 'Transfers in (30 d)'], ['transfersOut30d', 'Transfers out (30 d)']];
  const cell = (k: string, v: number | null) => k === 'occupancyRate' ? (v === null ? '—' : <span className={v > 100 ? 'font-semibold text-red-700' : ''}>{v}%{v > 100 ? ' ⚠ over capacity' : ''}</span>) : v;
  const max = Math.max(...r.byMonth.map((m: any) => Math.max(m.admissions, m.releases)));
  return (
    <>
      <PageHeader title="Reports & analytics" subtitle={`Aggregated by regional command within your jurisdiction · generated ${fmtDateTime(r.generatedAt)}`} />
      <Table head={['Command', ...cols.map((c) => c[1])]} empty={!r.rows.length}>
        {r.rows.map((row: any) => <tr key={row.id}><td className="font-medium">{row.name}</td>{cols.map(([k]) => <td key={k} className="tabular-nums">{cell(k, row[k])}</td>)}</tr>)}
        {r.rows.length > 1 && <tr className="bg-slate-50 font-semibold"><td>Total</td>{cols.map(([k]) => <td key={k} className="tabular-nums">{cell(k, r.total[k])}</td>)}</tr>}
      </Table>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BarChart title="Admissions per month" color="#15803d" max={max} data={r.byMonth.map((m: any) => ({ label: monthLabel(m.month), value: m.admissions }))} />
        <BarChart title="Releases per month" color="#15803d" max={max} data={r.byMonth.map((m: any) => ({ label: monthLabel(m.month), value: m.releases }))} />
      </div>
      <p className="mt-4 text-xs text-slate-500">Both charts share one scale so the months can be compared directly.</p>
    </>
  );
}
