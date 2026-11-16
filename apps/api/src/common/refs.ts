import { PrismaClient } from '@justiceone/database';

type Seq = 'person' | 'arrest' | 'custody' | 'case' | 'incident' | 'prison' | 'bgcheck';

/** Next human-readable reference, e.g. DEMO-ARR-100001. The DEMO prefix marks every record as synthetic. */
export async function nextRef(db: Pick<PrismaClient, '$queryRawUnsafe'>, seq: Seq, code: string): Promise<string> {
  const rows = (await db.$queryRawUnsafe(`SELECT nextval('j1_${seq}_seq')::text AS n`)) as Array<{ n: string }>;
  return `DEMO-${code}-${rows[0].n}`;
}
