import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { NAV } from '@/lib/nav';
import { WORKSPACE_HOME } from '@nexcust/contracts';
import { WorkspaceLabel, WorkspaceNav, type WorkspaceMenu } from '@/components/workspace-nav';
import { LogoutButton } from '@/components/logout-button';
import { Wordmark } from '@/components/brand';

/** One visual identity for every workspace; the workspace label and dashboards differ, the brand does not. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');
  // One menu per workspace the person's roles open (testers hold Police, Prisons and the applicant portal).
  const menus: WorkspaceMenu[] = (user.workspaces?.length ? user.workspaces : [user.workspace]).map((key) => ({
    key, title: NAV[key].title, home: WORKSPACE_HOME[key],
    items: NAV[key].items.filter((i) => !i.permission || user.permissions.includes(i.permission)),
  }));
  const tester = user.assignments.some((x) => x.roleCode.startsWith('TESTER_'));
  const a = user.assignments[0];
  const role = tester ? 'Tester · full access except administration' : `${a?.roleName ?? ''}${a?.orgUnitName ? ` · ${a.orgUnitName}` : ''}`;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand text-white md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Wordmark inverse size="sm" />
          <div className="mt-1.5 pl-[30px] text-xs font-medium uppercase tracking-[0.2em] text-white/60"><WorkspaceLabel menus={menus} /></div>
        </div>
        <WorkspaceNav menus={menus} />
        <div className="mt-auto px-5 py-4 text-[11px] leading-relaxed text-white/50">Prototype · synthetic records<br />Powered by Fourth IT</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{user.displayName}</div>
            <div className="truncate text-xs text-slate-500">{role}</div>
          </div>
          <LogoutButton />
        </header>
        <div className="bg-brand md:hidden"><div className="px-5 pt-4"><Wordmark inverse size="sm" /></div><WorkspaceNav menus={menus} /></div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
