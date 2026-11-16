import { api } from '@/lib/api';
import { Badge, Card, PageHeader, Table } from '@/components/ui';

export async function ReferenceView() {
  const ref = await api<any>('/reference');
  return (
    <>
      <PageHeader title="Administration · institutional reference data" subtitle="Ranks, appointments and unit types are configurable data with an evidence status — nothing here is hard-coded" />
      <Card className="mb-4 p-4 text-sm text-slate-600">
        <Badge>VERIFIED</Badge> read in an authoritative source · <Badge>PROVISIONAL</Badge> secondary evidence · <Badge>UNCONFIRMED</Badge> needs confirmation from the Service. Full evidence register: <code>docs/research/08-evidence-register.md</code>.
      </Card>
      <h2 className="mb-2 font-semibold">Rank catalogue</h2>
      <Table head={['#', 'Rank', 'Abbr.', 'Category', 'Source', 'Evidence']}>
        {ref.ranks.map((r: any) => <tr key={r.id}><td className="tabular-nums text-slate-500">{r.seniorityOrder}</td><td className="font-medium">{r.name}{r.notes && <div className="text-xs font-normal text-slate-500">{r.notes}</div>}</td><td>{r.abbreviation ?? '—'}</td><td>{r.category.replace(/_/g, ' ')}</td><td className="text-xs text-slate-500">{r.sourceRef}</td><td><Badge>{r.verificationStatus}</Badge></td></tr>)}
      </Table>
      <h2 className="mb-2 mt-6 font-semibold">Appointments (held separately from rank)</h2>
      <Table head={['Appointment', 'Command post', 'Source', 'Evidence']}>
        {ref.appointments.map((a: any) => <tr key={a.id}><td className="font-medium">{a.title}</td><td>{a.isCommand ? 'Yes' : 'No'}</td><td className="text-xs text-slate-500">{a.sourceRef}</td><td><Badge>{a.verificationStatus}</Badge></td></tr>)}
      </Table>
      <h2 className="mb-2 mt-6 font-semibold">Organizational unit types</h2>
      <Table head={['Level', 'Unit type', 'Source', 'Evidence']}>
        {ref.orgUnitTypes.map((t: any) => <tr key={t.id}><td className="tabular-nums text-slate-500">{t.level}</td><td className="font-medium">{t.name}</td><td className="text-xs text-slate-500">{t.sourceRef}</td><td><Badge>{t.verificationStatus}</Badge></td></tr>)}
      </Table>
      <h2 className="mb-2 mt-6 font-semibold">Establishment types</h2>
      <Table head={['Type', 'Evidence']}>
        {ref.facilityTypes.map((t: any) => <tr key={t.id}><td className="font-medium">{t.name}</td><td><Badge>{t.verificationStatus}</Badge></td></tr>)}
      </Table>
    </>
  );
}
