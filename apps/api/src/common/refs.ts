import { PrismaClient } from '@nexcust/database';

type Seq = 'person' | 'arrest' | 'custody' | 'case' | 'incident' | 'prison' | 'bgcheck';

/** Next human-readable reference, e.g. NX-ARR-100001. The NX prefix marks a NEXCUST reference, so it cannot be confused with a Service's own numbering. */
export async function nextRef(db: Pick<PrismaClient, '$queryRawUnsafe'>, seq: Seq, code: string): Promise<string> {
  const rows = (await db.$queryRawUnsafe(`SELECT nextval('j1_${seq}_seq')::text AS n`)) as Array<{ n: string }>;
  return `NX-${code}-${rows[0].n}`;
}
