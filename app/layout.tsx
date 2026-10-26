import type { Metadata, Viewport } from 'next';
import { ogImage } from '@/lib/seo';
import { siteUrl } from '@/lib/supabase/config';
import './globals.css';

export const dynamic = 'force-dynamic';

const siteName = 'FastHand Status';
const description =
  'Live health, measured uptime, incident history, and scheduled maintenance for every FastHand service. Uptime comes from real automated checks, never estimates.';
const logoUrl = `${siteUrl.replace(/\/+$/, '')}/og-logo.png`;

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl,
  description,
  inLanguage: 'en',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: 'FastHand Status — live uptime and incident history',
    template: '%s — FastHand Status',
  },
  description,
  keywords: [
    'FastHand status',
    'FastHand uptime',
    'service status',
    'uptime monitoring',
    'incident history',
    'status page',
  ],
  category: 'technology',
  openGraph: {
    type: 'website',
    siteName,
    title: 'FastHand Status — live uptime and incident history',
    description,
    locale: 'en_US',
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FastHand Status — live uptime and incident history',
    description,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <meta property="og:logo" content={logoUrl} />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
