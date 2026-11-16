/** Regenerates the roles table and the authorization matrix in docs/02 from @nexcust/contracts. Run: pnpm docs:authz */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PERMISSIONS, ROLES } from '../packages/contracts/src/index';

const file = join(__dirname, '..', 'docs', '02-api-contracts-authz.md');
const doc = readFileSync(file, 'utf8');
const roles = ['| Role | Institution | Scope | Normally assigned at | Workspace |', '|---|---|---|---|---|',
  ...ROLES.map((r) => `| ${r.name} | ${r.institution ?? '—'} | ${r.scopeLevel} | ${r.typicalScope ?? '—'} | ${r.workspace} |`)].join('\n');
const matrix = [`| Permission | ${ROLES.map((r) => r.code.replace(/_/g, ' ')).join(' | ')} |`, `|---|${ROLES.map(() => ':-:').join('|')}|`,
  ...Object.keys(PERMISSIONS).map((p) => `| \`${p}\` | ${ROLES.map((r) => ((r.permissions as string[]).includes(p) ? '●' : '')).join(' | ')} |`)].join('\n');
const replaceTable = (text: string, heading: string, table: string) => {
  const start = text.indexOf('|', text.indexOf(heading));
  let end = start; const lines = text.slice(start).split('\n'); let n = 0;
  while (n < lines.length && lines[n].startsWith('|')) { end += lines[n].length + 1; n++; }
  return text.slice(0, start) + table + '\n' + text.slice(end);
};
writeFileSync(file, replaceTable(replaceTable(doc, '## 3. Roles', roles), '## 4. Authorization matrix', matrix));
console.log(`docs/02: ${ROLES.length} roles × ${Object.keys(PERMISSIONS).length} permissions`);
