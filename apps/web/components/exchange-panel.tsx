import { api, fmtDateTime } from '@/lib/api';
import { Badge, Button, Card, Label, inputCls } from '@/components/ui';
import { requestExchange } from '@/app/(workspace)/person-actions';

/** Ask the other institution for a minimal custody summary. Shows the answer when ?exchange=<id> is present. */
export async function ExchangePanel({ personId, provider, returnTo, exchangeId, defaultPurpose, defaultBasis }:
  { personId: string; provider: 'POLICE' | 'PRISONS'; returnTo: string; exchangeId?: string; defaultPurpose: string; defaultBasis: string }) {
  const r = exchangeId ? await api<any>(`/exchange/requests/${exchangeId}`).catch(() => null) : null;
  const s = r?.personId === personId ? r.disclosedSummary : null;
  const other = provider === 'POLICE' ? 'Ghana Police Service' : 'Ghana Prisons Service';
  return (
    <Card className="p-5">
      <h2 className="font-semibold">{provider === 'POLICE' ? 'Police custody check' : 'Prison custody check'}</h2>
      <p className="mt-1 text-sm text-slate-600">Request a minimal summary from the {other} (demonstration). Your purpose and legal basis are recorded with the request and in the audit trail.</p>
      {s ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="mb-2 font-medium">{s.kind === 'POLICE_CUSTODY_SUMMARY' ? (s.currentlyInPoliceCustody ? 'Currently in police custody' : 'Not currently in police custody') : (s.currentlyInPrisonCustody ? 'Currently held in prison custody' : 'Not currently held in prison custody')} · as at {fmtDateTime(s.asAt)}</div>
          {s.episodes.length === 0 ? <p className="text-slate-600">No records held.</p> : (
            <ul className="space-y-1">{s.episodes.map((e: any, i: number) => s.kind === 'POLICE_CUSTODY_SUMMARY'
              ? <li key={i}>{e.reference} · {e.station} · {fmtDateTime(e.detainedAt)} – {fmtDateTime(e.closedAt)} <Badge>{e.status}</Badge></li>
              : <li key={i}>{e.establishment} · {fmtDateTime(e.from)} – {fmtDateTime(e.to)} <Badge>{e.classification}</Badge> <Badge>{e.status}</Badge></li>)}</ul>)}
        </div>
      ) : (
        <form action={requestExchange} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="personId" value={personId} /><input type="hidden" name="providingInstitution" value={provider} /><input type="hidden" name="returnTo" value={returnTo} />
          <Label text="Purpose"><input name="purpose" required minLength={10} maxLength={300} defaultValue={defaultPurpose} className={inputCls} /></Label>
          <Label text="Legal basis"><input name="legalBasis" required minLength={5} maxLength={300} defaultValue={defaultBasis} className={inputCls} /></Label>
          <div className="md:col-span-2"><Button tone="secondary">Request summary</Button></div>
        </form>
      )}
    </Card>
  );
}
