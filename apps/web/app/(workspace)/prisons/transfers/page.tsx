import Link from 'next/link';
import type { Paginated } from '@nexcust/contracts';
import { api, fmtDateTime, getSession, qs } from '@/lib/api';
import { Badge, Button, Flash, PageHeader, Table } from '@/components/ui';
import { decide, warrantReturned } from '../actions';

function Act({ kind, id, decision, label, tone }: { kind: string; id: string; decision: string; label: string; tone?: 'primary' | 'secondary' }) {
  return <form action={decide}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value={decision} /><Button tone={tone}>{label}</Button></form>;
}

export default async function TransfersReleases({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const user = (await getSession())!; const can = (p: string) => user.permissions.includes(p as never);
  const [transfers, releases] = await Promise.all([api<Paginated<any>>(`/prisons/transfers${qs({ pageSize: '50' })}`), api<Paginated<any>>(`/prisons/releases${qs({ pageSize: '50' })}`)]);
  const name = (r: any) => <><Link prefetch={false} className="font-medium text-brand hover:underline" href={`/prisons/prisoners/${r.episode.id}`}>{r.episode.prisonerRecord.prisonerNumber}</Link><div className="text-xs text-slate-500">{r.episode.prisonerRecord.person.surname}, {r.episode.prisonerRecord.person.otherNames}</div></>;
  return (
    <>
      <PageHeader title="Transfers & releases" subtitle="Initiated by records staff · authorized by a second officer · transfers confirmed by the receiving establishment" />
      <Flash sp={sp} />
      <h2 className="mb-2 font-semibold">Transfers</h2>
      <Table head={['Reference', 'Prisoner', 'From', 'To', 'Reason', 'Initiated', 'Status', '']} empty={!transfers.items.length}>
        {transfers.items.map((t) => (
          <tr key={t.id}><td className="font-medium">{t.reference}</td><td>{name(t)}</td><td>{t.fromFacility.name}</td><td>{t.toFacility.name}</td><td>{t.reason}</td><td className="whitespace-nowrap">{fmtDateTime(t.createdAt)}</td>
            <td><Badge tone={t.status === 'INITIATED' ? 'amber' : t.status === 'IN_TRANSIT' ? 'blue' : t.status === 'RECEIVED' ? 'green' : undefined}>{t.status}</Badge></td>
            <td><div className="flex justify-end gap-2">
              {t.status === 'INITIATED' && can('prisons.transfer.approve') && <><Act kind="transfer" id={t.id} decision="approve" label="Approve & dispatch" /><Act kind="transfer" id={t.id} decision="reject" label="Reject" tone="secondary" /></>}
              {t.status === 'IN_TRANSIT' && can('prisons.prisoner.write') && <Act kind="transfer" id={t.id} decision="receive" label="Confirm arrival" />}
            </div></td></tr>
        ))}
      </Table>
      <h2 className="mb-2 mt-6 font-semibold">Releases</h2>
      <Table head={['Reference', 'Prisoner', 'Establishment', 'Type', 'Legal authority', 'Initiated', 'Status', '']} empty={!releases.items.length}>
        {releases.items.map((r) => (
          <tr key={r.id}><td className="font-medium">{r.reference}</td><td>{name(r)}</td><td>{r.facility.name}</td><td>{r.type.replace(/_/g, ' ').toLowerCase()}{r.warrantReturnedAt ? <div className="text-xs text-slate-500">warrant returned {fmtDateTime(r.warrantReturnedAt)}</div> : null}</td><td className="max-w-xs text-xs">{r.legalAuthority}</td><td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
            <td><Badge tone={r.status === 'INITIATED' ? 'amber' : r.status === 'COMPLETED' ? 'green' : undefined}>{r.status}</Badge></td>
            <td><div className="flex justify-end gap-2">
              {r.status === 'INITIATED' && can('prisons.release.approve') && <><Act kind="release" id={r.id} decision="approve" label="Authorize release" /><Act kind="release" id={r.id} decision="reject" label="Reject" tone="secondary" /></>}
              {r.status === 'COMPLETED' && !r.warrantReturnedAt && can('prisons.prisoner.write') && <form action={warrantReturned}><input type="hidden" name="id" value={r.id} /><Button tone="secondary">Warrant returned to court</Button></form>}
            </div></td></tr>
        ))}
      </Table>
    </>
  );
}
