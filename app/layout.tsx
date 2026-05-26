import type { Metadata } from 'next';
import { Manrope, Instrument_Serif } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DisclaimerBand } from '@/components/layout/DisclaimerBand';
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
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Nicole Hansult Coaching' }],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${instrumentSerif.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">
        {children}
        <DisclaimerBand />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
