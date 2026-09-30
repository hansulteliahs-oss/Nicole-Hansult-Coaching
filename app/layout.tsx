import type { Metadata } from 'next';
import { Manrope, Instrument_Serif } from 'next/font/google';
import { ScrubbedAnalytics } from '@/components/analytics/ScrubbedAnalytics';
import { DisclaimerBand } from '@/components/layout/DisclaimerBand';
import { site } from '@/lib/content/site';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
});

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Nicole Hansult Coaching',
    template: '%s — Nicole Hansult Coaching',
  },
  description: 'Functional longevity coaching in Carlsbad, CA.',
  openGraph: {
    type: 'website',
    siteName: 'Nicole Hansult Coaching',
    locale: 'en_US',
    images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

const socialUrls = Object.values(site.socials).filter(Boolean);

// City only on purpose: no street address or phone is published (decided 2026-09-30).
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LocalBusiness',
      '@id': `${BASE_URL}/#business`,
      name: site.nap.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: site.nap.city,
        addressRegion: site.nap.region,
        addressCountry: site.nap.country,
      },
      areaServed: ['Carlsbad', 'Encinitas', 'Oceanside', 'San Marcos', 'Vista'].map(
        (name) => ({ '@type': 'City', name }),
      ),
      email: site.contactEmail,
      url: BASE_URL,
      image: `${BASE_URL}/og.png`,
      sameAs: socialUrls,
      founder: { '@id': `${BASE_URL}/#nicole` },
    },
    {
      '@type': 'Person',
      '@id': `${BASE_URL}/#nicole`,
      name: 'Nicole Hansult',
      jobTitle: 'Functional Longevity Coach',
      worksFor: { '@id': `${BASE_URL}/#business` },
      sameAs: socialUrls,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${instrumentSerif.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        {children}
        <DisclaimerBand />
        <ScrubbedAnalytics />
      </body>
    </html>
  );
}
