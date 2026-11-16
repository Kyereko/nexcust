import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { NAV } from '@/lib/nav';
import { NavLinks } from '@/components/nav-links';
import { LogoutButton } from '@/components/logout-button';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');
  const ws = NAV[user.workspace];
  const items = ws.items.filter((i) => !i.permission || user.permissions.includes(i.permission));
  const a = user.assignments[0];
  return (
    <div className="flex min-h-[calc(100vh-28px)]">
      <aside className={`hidden w-64 shrink-0 flex-col text-white md:flex ${ws.accent}`}>
        <div className="border-b border-white/15 px-5 py-4">
          <div className="text-xs font-semibold tracking-widest text-white/60">JUSTICEONE</div>
          <div className="text-lg font-semibold tracking-wide">{ws.title}</div>
        </div>
        <NavLinks items={items} root={items[0]?.href ?? '/'} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex items-center justify-between gap-4 px-6 py-3 text-white ${ws.accent}`}>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.displayName}</div>
            <div className="truncate text-xs text-white/70">{a?.roleName}{a?.orgUnitName ? ` · ${a.orgUnitName}` : ''}</div>
          </div>
          <LogoutButton />
        </header>
        <div className="md:hidden"><div className={ws.accent}><NavLinks items={items} root={items[0]?.href ?? '/'} /></div></div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
