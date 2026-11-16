import Link from 'next/link';
import type { Paginated } from '@nexcust/contracts';
import { api, fmtDate, getSession, qs } from '@/lib/api';
import { Card, Flash, LinkButton, PageHeader, Pager, SearchBar, Table } from '@/components/ui';

export default async function People({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const user = (await getSession())!; const term = sp.q?.trim();
  const data = term && term.length >= 2 ? await api<Paginated<any>>(`/persons${qs({ q: term, page: sp.page })}`) : null;
  const can = (p: string) => user.permissions.includes(p as never);
  return (
    <>
      <PageHeader title="People & records" subtitle="National Person Index — identity only. Every search is recorded in the audit trail.">
        {can('person.write') && <LinkButton href="/police/people/new">Register new person</LinkButton>}
      </PageHeader>
      <Flash sp={sp} />
      <SearchBar q={sp.q} placeholder="Name, index number or identifier" />
      {!data ? <Card className="p-8 text-sm text-slate-600">Search for an existing person before creating a new identity record. Enter at least two characters.</Card> : (
        <>
          <Table head={['Index no.', 'Name', 'Sex', 'Date of birth', 'Hometown', 'Identifiers', '']} empty={!data.items.length}>
            {data.items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50"><td className="font-medium">{p.indexNumber}</td><td>{p.surname}, {p.otherNames}</td><td>{p.sex}</td><td className="whitespace-nowrap">{fmtDate(p.dateOfBirth)}</td><td>{p.hometown ?? '—'}</td>
                <td className="text-xs">{p.identifiers.map((i: any) => `${i.type.replace(/_/g, ' ')}: ${i.value}`).join('; ') || '—'}</td>
                <td className="whitespace-nowrap text-right">
                  {can('police.case.read') && <Link prefetch={false} className="text-brand hover:underline" href={`/police/people/${p.id}`}>Police record</Link>}
                  {can('police.custody.write') && <Link prefetch={false} className="ml-4 text-brand hover:underline" href={`/police/custody/new?personId=${p.id}`}>Register arrest</Link>}
                </td></tr>
            ))}
          </Table>
          <Pager total={data.total} page={data.page} pageSize={data.pageSize} base="/police/people" params={{ q: sp.q }} />
        </>
      )}
    </>
  );
}
