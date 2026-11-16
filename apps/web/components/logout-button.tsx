'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.replace('/login'); router.refresh(); }}
      className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-sage"
    >Sign out</button>
  );
}
