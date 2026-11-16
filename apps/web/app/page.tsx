import { redirect } from 'next/navigation';
import { WORKSPACE_HOME } from '@nexcust/contracts';
import { getSession } from '@/lib/api';
import { Landing } from '@/components/landing';

/** Signed-in people go straight to their workspace; everyone else sees the public landing page. */
export default async function Home() {
  const user = await getSession();
  if (user) redirect(WORKSPACE_HOME[user.workspace]);
  return <Landing />;
}
