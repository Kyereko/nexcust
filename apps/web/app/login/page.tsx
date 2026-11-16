import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { ParticleBackdrop } from '@/components/particles';
import { SignInForm } from '@/components/sign-in';

/** Full-screen sign-in: the NEXCUST wordmark assembles from particles above the form. */
export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-end justify-items-center px-4 pb-[max(24px,7vh)] pt-[34vh] max-sm:place-items-center max-sm:pt-[30vh]">
      <ParticleBackdrop y={0.18} size={0.17} />
      <section className="relative z-10 w-full max-w-sm rounded-xl border border-line bg-white/90 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between"><h1 className="text-lg font-semibold text-brand">Sign in</h1><span className="sr-only"><Wordmark size="sm" /></span></div>
        <SignInForm autoFocus />
        <div className="mt-5 flex justify-between border-t border-line pt-4 text-xs">
          <Link href="/" className="font-medium text-brand underline decoration-gold underline-offset-2">About NEXCUST</Link>
          <Link href="/verify" className="font-medium text-brand underline decoration-gold underline-offset-2">Verify a certificate</Link>
        </div>
      </section>
    </main>
  );
}
