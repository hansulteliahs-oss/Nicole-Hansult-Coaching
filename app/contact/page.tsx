/**
 * Contact page — /contact
 *
 * Server Component. Renders the ContactForm client component inside a
 * centered container. Nav + Footer are provided by RootLayout.
 *
 * On success: ContactForm swaps itself for an inline thank-you message.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Label } from '@/components/ui/Label';
import { ContactForm } from '@/components/forms/ContactForm';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Contact | Nicole Hansult Coaching',
  description:
    'Reach out to Nicole Hansult Coaching — functional longevity coaching in Carlsbad, CA. Nicole personally reads every message.',
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
  openGraph: {
    title: 'Contact | Nicole Hansult Coaching',
    description:
      'Reach out to Nicole Hansult Coaching — functional longevity coaching in Carlsbad, CA.',
  },
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        {/* Hero */}
        <section className="bg-bgAlt px-6 pt-32 pb-16 md:pt-40">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Label>Let&apos;s connect</Label>
            <h1 className="text-ink text-5xl md:text-6xl font-light leading-[1.05]">
              Get in Touch
            </h1>
            <p className="text-inkSoft text-lg max-w-xl mx-auto">
              Nicole personally reads every message. Expect a response within
              1&ndash;2 business days.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="bg-bg px-6 py-16">
          <div className="mx-auto max-w-xl">
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
