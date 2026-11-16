import { PrismaService } from '../prisma/prisma.module';
import { AccessScope, unitWhere } from './access';

export interface Bucket { id: string; name: string; facilityIds: string[] }

/**
 * Roll-up units for a report: the regional commands inside the caller's scope; if the caller sits
 * below regional level, their own unit. Facilities are assigned by materialised path.
 */
export async function rollupBuckets(prisma: PrismaService, scope: AccessScope, institution: 'POLICE' | 'PRISONS'): Promise<Bucket[]> {
  const facilities = await prisma.facility.findMany({ where: { institution: { code: institution }, orgUnit: unitWhere(scope) }, select: { id: true, orgUnit: { select: { path: true } } } });
  const regions = await prisma.organizationalUnit.findMany({ where: { institution: { code: institution }, type: { code: 'REGIONAL_COMMAND' }, ...unitWhere(scope) }, orderBy: { name: 'asc' }, select: { id: true, name: true, path: true } });
  const buckets: Bucket[] = regions.map((r) => ({ id: r.id, name: r.name, facilityIds: facilities.filter((f) => f.orgUnit.path.startsWith(r.path)).map((f) => f.id) })).filter((b) => b.facilityIds.length);
  if (buckets.length) return buckets;
  const own = scope.paths[0] ? await prisma.organizationalUnit.findFirst({ where: { path: scope.paths[0] }, select: { id: true, name: true } }) : null;
  return own ? [{ id: own.id, name: own.name, facilityIds: facilities.map((f) => f.id) }] : [];
}

export const sumBy = (rows: Array<{ facilityId: string; _count: { _all: number } }>, ids: string[]) => rows.filter((r) => ids.includes(r.facilityId)).reduce((n, r) => n + r._count._all, 0);

/** Last `n` calendar months (UTC) as YYYY-MM keys, oldest first. */
export function lastMonths(n: number) {
  const now = new Date(); const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); out.push(d.toISOString().slice(0, 7)); }
  return out;
}
export const monthStart = (key: string) => new Date(`${key}-01T00:00:00Z`);
export const tally = (dates: Date[], months: string[]) => months.map((m) => ({ month: m, count: dates.filter((d) => d.toISOString().slice(0, 7) === m).length }));
