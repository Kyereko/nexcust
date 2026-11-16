'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.replace('/login'); router.refresh(); }}
      className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
    >Sign out</button>
  );
}
