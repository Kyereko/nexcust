import { api } from '@/lib/api';
import { Badge, PageHeader, Table } from '@/components/ui';

export default async function Stations() {
  const rows = await api<any[]>('/police/stations');
  return (
    <>
      <PageHeader title="Stations & commands" subtitle="Command hierarchy: Regional Command → Division → District → Station (configurable reference data)" />
      <Table head={['Code', 'Station', 'District', 'Division', 'Regional command', 'Cell capacity', 'Record type']} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}><td className="font-medium">{r.code}</td><td>{r.name}</td><td>{r.orgUnit.parent?.name}</td><td>{r.orgUnit.parent?.parent?.name}</td><td>{r.orgUnit.parent?.parent?.parent?.name}</td>
            <td className="tabular-nums">{r.capacity ?? '—'}</td><td>{r.isSynthetic ? <Badge tone="blue">SYNTHETIC</Badge> : <Badge tone="green">REFERENCE</Badge>}</td></tr>
        ))}
      </Table>
    </>
  );
}
