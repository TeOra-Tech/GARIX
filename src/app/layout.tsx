import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Analytics } from '@/components/analytics';
import { RegisterServiceWorker } from '@/components/register-sw';
import { HashSessionHandler } from '@/components/auth/hash-session';
import './globals.css';

// Poppins is the brand's sole typeface (Brand Guidelines §15).
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://garix.ie'),
  title: {
    default: 'Garix — Find the right garage. Get the right service.',
    template: '%s | Garix',
  },
  description:
    'Garix connects vehicle owners with trusted mechanic garages across Ireland. Post your repair, compare real quotes with full VAT breakdowns, and book with confidence.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.png', apple: '/icons/icon-192.png' },
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    siteName: 'Garix',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = { themeColor: '#FFFFFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className={poppins.variable}>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <RegisterServiceWorker />
        <HashSessionHandler />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Garix',
              url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://garix.ie',
              description: 'Marketplace connecting vehicle owners with mechanic garages across Ireland.',
            }),
          }}
        />
      </body>
    </html>
  );
}
