import { api } from '@/lib/api';
import { Badge, PageHeader, Table } from '@/components/ui';

export default async function Rehabilitation() {
  const rows = await api<any[]>('/prisons/rehabilitation');
  return (
    <>
      <PageHeader title="Rehabilitation" subtitle="Programmes offered at establishments in your command. Enroll prisoners from their registry record." />
      <Table head={['Programme', 'Category', 'Establishment', 'Enrolled / capacity', 'Status']} empty={!rows.length}>
        {rows.map((r) => <tr key={r.id}><td className="font-medium">{r.name}</td><td>{r.category}</td><td>{r.facility.name}</td><td className="tabular-nums">{r._count.enrollments} / {r.capacity ?? '—'}</td><td><Badge tone={r.active ? 'green' : 'slate'}>{r.active ? 'ACTIVE' : 'INACTIVE'}</Badge></td></tr>)}
      </Table>
    </>
  );
}
