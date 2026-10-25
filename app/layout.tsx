import type { Metadata, Viewport } from 'next';
import { siteUrl } from '@/lib/supabase/config';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FastHand Status',
    template: '%s — FastHand Status',
  },
  description:
    'Live health, uptime, incidents, and maintenance for FastHand services. Uptime is calculated from real automated checks.',
  openGraph: {
    title: 'FastHand Status',
    description: 'Live health, uptime, and incident history for FastHand services.',
    type: 'website',
    siteName: 'FastHand Status',
  },
  twitter: {
    card: 'summary',
    title: 'FastHand Status',
    description: 'Live health, uptime, and incident history for FastHand services.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3f1e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
