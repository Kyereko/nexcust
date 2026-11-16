import { api, fmtDateTime } from '@/lib/api';
import { BarChart, monthLabel } from '@/components/bar-chart';
import { PageHeader, Table } from '@/components/ui';

export default async function PoliceReports() {
  const r = await api<any>('/police/reports');
  const cols: Array<[string, string]> = [['stations', 'Stations'], ['inCustody', 'In custody'], ['pastDeadline', 'Past court deadline'], ['arrests30d', 'Arrests (30 d)'], ['custodyClosed30d', 'Custody closed (30 d)'], ['openCases', 'Open cases'], ['personnel', 'Active personnel']];
  return (
    <>
      <PageHeader title="Reports & analytics" subtitle={`Aggregated by command within your jurisdiction · generated ${fmtDateTime(r.generatedAt)}`} />
      <Table head={['Command', ...cols.map((c) => c[1])]} empty={!r.rows.length}>
        {r.rows.map((row: any) => (
          <tr key={row.id}><td className="font-medium">{row.name}</td>{cols.map(([k]) => <td key={k} className={`tabular-nums ${k === 'pastDeadline' && row[k] ? 'font-semibold text-red-700' : ''}`}>{row[k]}{k === 'pastDeadline' && row[k] ? ' ⚠' : ''}</td>)}</tr>
        ))}
        {r.rows.length > 1 && <tr className="bg-slate-50 font-semibold"><td>Total</td>{cols.map(([k]) => <td key={k} className="tabular-nums">{r.total[k]}</td>)}</tr>}
      </Table>
      <div className="mt-6 max-w-2xl"><BarChart title="Arrests per month (last six months)" color="#1d4ed8" data={r.arrestsByMonth.map((m: any) => ({ label: monthLabel(m.month), value: m.count }))} /></div>
      <p className="mt-4 text-xs text-slate-500">Figures are computed live from persisted records. Arrests are events, not findings of guilt.</p>
    </>
  );
}
