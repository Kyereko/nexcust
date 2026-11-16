import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXCUST — Demonstration',
  description: 'NEXCUST — Connected Institutions. Trusted Records. Prototype using synthetic data; not an official Ghana Police Service or Ghana Prisons Service system. Powered by Fourth IT.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const label = process.env.NEXT_PUBLIC_ENV_LABEL ?? 'DEMONSTRATION';
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div role="status" className="bg-gold px-4 py-1 text-center text-xs font-semibold tracking-wide text-ink">
          {label} ENVIRONMENT · SYNTHETIC DATA ONLY · NOT AN OFFICIAL GHANA POLICE SERVICE OR GHANA PRISONS SERVICE SYSTEM
        </div>
        {children}
      </body>
    </html>
  );
}
