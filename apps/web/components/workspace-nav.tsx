'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/nav';
import { NavLinks } from './nav-links';

export interface WorkspaceMenu { key: string; title: string; home: string; items: NavItem[] }

/** The current workspace follows the address: /police/... is Police, /prisons/... is Prisons. */
function current(menus: WorkspaceMenu[], path: string) {
  return menus.find((m) => m.home !== '/' && (path === m.home || path.startsWith(`${m.home}/`))) ?? menus.find((m) => m.items.some((i) => path.startsWith(i.href))) ?? menus[0];
}

export function WorkspaceLabel({ menus }: { menus: WorkspaceMenu[] }) {
  const ws = current(menus, usePathname());
  return <>{ws.title.charAt(0) + ws.title.slice(1).toLowerCase()}</>;
}

/** Workspace switcher (only for people whose roles open more than one workspace) and that workspace's menu. */
export function WorkspaceNav({ menus }: { menus: WorkspaceMenu[] }) {
  const path = usePathname();
  const ws = current(menus, path);
  return (
    <>
      {menus.length > 1 && (
        <div className="mx-3 mt-3 flex rounded-md bg-white/10 p-0.5" role="group" aria-label="Workspace">
          {menus.map((m) => (
            <Link key={m.key} href={m.home} prefetch={false} aria-current={m.key === ws.key ? 'true' : undefined}
              className={`flex-1 rounded px-2 py-1.5 text-center text-xs font-medium ${m.key === ws.key ? 'bg-canvas text-brand' : 'text-white/75 hover:text-white'}`}>
              {m.title.charAt(0) + m.title.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      )}
      <NavLinks items={ws.items} root={ws.items[0]?.href ?? '/'} />
    </>
  );
}
