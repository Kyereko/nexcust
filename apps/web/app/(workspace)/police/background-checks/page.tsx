import Link from 'next/link';
import type { Paginated } from '@nexcust/contracts';
import { api, fmtDateTime, qs } from '@/lib/api';
import { Badge, Flash, PageHeader, Pager, SearchBar, Table } from '@/components/ui';
import { BG_LABEL, BG_STATUSES, bgTone, businessDays } from '@/lib/status';

const OPEN = ['SUBMITTED', 'PAYMENT_CONFIRMED', 'APPOINTMENT_BOOKED', 'BIOMETRICS_CAPTURED', 'RECORDS_SEARCHED', 'UNDER_INVESTIGATION', 'ADDITIONAL_INFO_REQUESTED', 'UNDER_REVIEW', 'VALIDATED', 'IDENTITY_VERIFIED'];

export default async function BackgroundChecks({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [data, ref] = await Promise.all([api<Paginated<any>>(`/police/background-checks${qs({ q: sp.q, status: sp.status, page: sp.page })}`), api<any>('/police/background-checks/reference')]);
  const target = ref.targetBusinessDays as number;
  return (
    <>
      <PageHeader title="Police clearance" subtitle="Back-office processing modelled on the Ghana Police Service eServices portal — NEXCUST complements the official portal; it does not replace it" />
      <Flash sp={sp} />
      <SearchBar q={sp.q} status={sp.status} statuses={BG_STATUSES} placeholder="Reference or applicant name" />
      <Table head={['Reference', 'Applicant', 'Service', 'Submitted', `Business days (target ${target})`, 'Stage']} empty={!data.items.length}>
        {data.items.map((a) => {
          const days = businessDays(new Date(a.submittedAt)); const open = OPEN.includes(a.status);
          return (
            <tr key={a.id} className="hover:bg-slate-50"><td><Link prefetch={false} className="font-medium text-brand hover:underline" href={`/police/background-checks/${a.id}`}>{a.reference}</Link></td>
              <td>{a.fullName}<div className="text-xs text-slate-500">{a.purpose}</div></td><td className="text-xs">{a.serviceType?.name ?? '—'}</td><td className="whitespace-nowrap">{fmtDateTime(a.submittedAt)}</td>
              <td className={`tabular-nums ${open && days > target ? 'font-semibold text-red-700' : open && days >= target - 2 ? 'font-semibold text-amber-700' : ''}`}>{open ? `${days}${days > target ? ' ⚠ overdue' : ''}` : '—'}</td>
              <td><Badge tone={bgTone(a.status)}>{BG_LABEL[a.status] ?? a.status}</Badge></td></tr>
          );
        })}
      </Table>
      <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/police/background-checks" params={{ q: sp.q, status: sp.status }} />
      <p className="mt-3 text-xs text-slate-500">Published service level: typically 6 to 8 business days (eServices portal). Public holidays are not yet modelled.</p>
    </>
  );
}
