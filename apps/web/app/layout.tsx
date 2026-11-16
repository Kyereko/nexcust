import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JusticeOne Ghana — Demonstration',
  description: 'Prototype using synthetic data. Not an official Ghana Police Service or Ghana Prisons Service system.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const label = process.env.NEXT_PUBLIC_ENV_LABEL ?? 'DEMONSTRATION';
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div role="status" className="bg-amber-400 px-4 py-1 text-center text-xs font-semibold tracking-wide text-amber-950">
          {label} ENVIRONMENT · SYNTHETIC DATA ONLY · NOT AN OFFICIAL GHANA POLICE SERVICE OR GHANA PRISONS SERVICE SYSTEM
        </div>
        {children}
      </body>
    </html>
  );
}
