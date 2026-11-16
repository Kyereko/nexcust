import Link from 'next/link';
import { api, fmtDateTime, qs } from '@/lib/api';
import { Badge, Card, PageHeader, Table } from '@/components/ui';

/** Return under s.16 of the Criminal and Other Offences (Procedure) Act, 1960 (Act 30). */
export default async function S16Return({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const r = await api<any>(`/police/reports/s16${qs({ month: sp.month })}`);
  const label = new Date(`${r.month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <Link href="/police/reports" className="text-sm text-brand hover:underline print:hidden">← Reports & analytics</Link>
      <PageHeader title="Section 16 monthly return" subtitle={`Persons arrested without warrant and not charged · ${label}`}>
        <form method="get" className="flex items-end gap-2 print:hidden">
          <label className="text-xs font-medium text-slate-700">Month<input type="month" name="month" defaultValue={r.month} className="mt-1 block rounded-md border border-line bg-white px-3 py-2 text-sm" /></label>
          <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">Show</button>
        </form>
      </PageHeader>
      <Card className="mb-4 p-4 text-sm text-slate-700">
        To: the District Magistrate. Return by the officer in charge of {r.stations.length ? r.stations.join(', ') : 'the station(s) in your command'}, made under section 16 of the Criminal and Other Offences (Procedure) Act, 1960 (Act 30): persons arrested without warrant within the limits of the station who were not subsequently charged, stating whether admitted to bail.
        <span className="mt-1 block text-xs text-slate-500">Receiving court and signatory to be configured per station. Juvenile identities are protected (Act 653 s.3). Generated {fmtDateTime(r.generatedAt)} · print this page for the return.</span>
      </Card>
      <Table head={['Arrest ref.', 'Station', 'Arrested', 'Person', 'Suspected offence', 'Basis', 'Custody status', 'Bail']} empty={!r.rows.length}>
        {r.rows.map((x: any) => (
          <tr key={x.id}><td className="font-medium">{x.reference}</td><td>{x.station}</td><td className="whitespace-nowrap">{fmtDateTime(x.arrestedAt)}</td>
            <td>{x.person.surname}, {x.person.otherNames}{x.juvenile && <> <Badge tone="amber">JUVENILE</Badge></>}</td><td>{x.suspectedOffence}</td>
            <td className="text-xs">{x.arrestBasis === 'PRIVATE_PERSON_S12' ? 'Private person (s.12)' : 'Without warrant (s.10)'}</td>
            <td><Badge>{x.custodyStatus}</Badge></td><td>{x.admittedToBail ? `Yes — report ${fmtDateTime(x.bail?.reportAt)}` : 'No'}</td></tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-slate-500">{r.rows.length} person(s). Arrests later charged are excluded.</p>
    </>
  );
}
