import { api } from '@/lib/api';
import { Badge, PageHeader, Table } from '@/components/ui';

export default async function Facilities() {
  const rows = await api<any[]>('/prisons/facilities');
  return (
    <>
      <PageHeader title="Facilities & housing" subtitle="Establishment register: type, command relationship, functions, capacity and occupancy" />
      <Table head={['Code', 'Establishment', 'Type', 'Regional command', 'Functions', 'Population / capacity', 'Occupancy', 'Record type']} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}><td className="font-medium">{r.code}</td><td>{r.name}</td><td>{r.type}</td><td>{r.regionalCommand}</td><td className="text-xs">{r.functions.join(', ')}</td>
            <td className="tabular-nums">{r.population} / {r.capacity ?? '—'}</td><td className={`tabular-nums ${r.occupancyRate > 100 ? 'font-semibold text-red-700' : ''}`}>{r.occupancyRate ?? '—'}%</td>
            <td>{r.isSynthetic ? <Badge tone="blue">SYNTHETIC</Badge> : <Badge tone="green">REFERENCE</Badge>}</td></tr>
        ))}
      </Table>
    </>
  );
}
