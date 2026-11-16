import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { NAV } from '@/lib/nav';
import { NavLinks } from '@/components/nav-links';
import { LogoutButton } from '@/components/logout-button';
import { Wordmark } from '@/components/brand';

/** One visual identity for every workspace; the workspace label and dashboards differ, the brand does not. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');
  const ws = NAV[user.workspace];
  const items = ws.items.filter((i) => !i.permission || user.permissions.includes(i.permission));
  const a = user.assignments[0];
  const label = ws.title.charAt(0) + ws.title.slice(1).toLowerCase();
  return (
    <div className="flex min-h-[calc(100vh-28px)]">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand text-white md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Wordmark inverse size="sm" />
          <div className="mt-1.5 pl-[30px] text-xs font-medium uppercase tracking-[0.2em] text-white/60">{label}</div>
        </div>
        <NavLinks items={items} root={items[0]?.href ?? '/'} />
        <div className="mt-auto px-5 py-4 text-[11px] text-white/50">Powered by Fourth IT</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{user.displayName}</div>
            <div className="truncate text-xs text-slate-500">{a?.roleName}{a?.orgUnitName ? ` · ${a.orgUnitName}` : ''}</div>
          </div>
          <LogoutButton />
        </header>
        <div className="bg-brand md:hidden"><div className="px-5 pt-4"><Wordmark inverse size="sm" /></div><NavLinks items={items} root={items[0]?.href ?? '/'} /></div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
