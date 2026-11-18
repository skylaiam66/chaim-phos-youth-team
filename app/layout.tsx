import type { ReactNode } from 'react';
import './globals.css';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppProviders from '@/components/AppProviders';

export const metadata = {
  title: 'CHAIM PHOS Youth Team',
  description:
    'Enkindle. Expand. Eternalise. Bringing young people together through friendship, leadership, community engagement and shared experiences.',
  manifest: '/manifest.json',
  applicationName: 'CHAIM PHOS',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent' as const,
    title: 'CHAIM PHOS',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <Header />
          <main>{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}