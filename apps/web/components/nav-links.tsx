'use client';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/nav';

/** Loading state for navigation: a pulse on the link being opened (must render inside <Link>). */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status" aria-label="Loading" className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-white" /> : null;
}

export function NavLinks({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Main">
      {items.map((i) => {
        const active = i.href === root ? path === root : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} prefetch={false} aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${active ? 'bg-white/15 font-medium text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
            <span>{i.label}<Pending /></span>
            {i.planned && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{i.planned}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
