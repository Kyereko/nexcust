import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXCUST',
  description: 'NEXCUST — Connected Institutions. Trusted Records. Prototype using synthetic data; not an official Ghana Police Service or Ghana Prisons Service system. Powered by Fourth IT.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
