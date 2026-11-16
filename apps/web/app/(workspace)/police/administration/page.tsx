import { api, getSession } from '@/lib/api';
import { ReferenceView } from '@/components/reference-view';
import { Badge, Table } from '@/components/ui';

export default async function Page() {
  const user = (await getSession())!;
  const ref = user.permissions.includes('police.bgcheck.read') ? await api<any>('/police/background-checks/reference') : null;
  return (
    <>
      <ReferenceView />
      {ref && (
        <>
          <h2 className="mb-2 mt-6 font-semibold">Police clearance services and published fees</h2>
          <Table head={['Service', 'Vetting fee', 'Photo & delivery', 'Fingerprints', 'Available', 'Evidence']}>
            {ref.serviceTypes.map((t: any) => <tr key={t.id}><td className="font-medium">{t.name}</td><td className="tabular-nums">{t.vettingFeeGhs ? `GH₵${t.vettingFeeGhs.toLocaleString()}` : '—'}</td><td className="tabular-nums">{t.addOnFeeGhs ? `GH₵${t.addOnFeeGhs}` : '—'}</td>
              <td>{t.requiresFingerprints ? 'Live-scan at centre' : 'Not taken'}</td><td>{t.available ? 'Yes' : 'Coming soon'}</td><td><Badge>{t.verificationStatus}</Badge></td></tr>)}
          </Table>
          <p className="mt-2 text-xs text-slate-500">Certificate validity: {ref.certificateValidityMonths} months (PROVISIONAL — confirm with CDSB). Clean-record wording: &ldquo;{ref.cleanWording}&rdquo; (PROVISIONAL). Target: {ref.targetBusinessDays} business days.</p>
          <h2 className="mb-2 mt-6 font-semibold">Authorised signatories</h2>
          <Table head={['Officer', 'Title', 'Signs for', 'Certificates signed', 'Active']}>
            {ref.signatories.map((x: any) => <tr key={x.id}><td className="font-medium">{x.name}</td><td>{x.signatoryTitle}</td><td>{x.signsFor}</td><td className="tabular-nums">{x.timesUsed}</td><td>{x.active ? 'Yes' : 'No'}</td></tr>)}
          </Table>
        </>
      )}
    </>
  );
}
