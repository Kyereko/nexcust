import { redirect } from 'next/navigation';
import { WORKSPACE_HOME } from '@nexcust/contracts';
import { getSession } from '@/lib/api';

export default async function Home() {
  const user = await getSession();
  redirect(user ? WORKSPACE_HOME[user.workspace] : '/login');
}
