import type { Metadata } from 'next';
import Image from 'next/image';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { OfferLadderCard } from '@/components/offers/OfferLadderCard';
import { Pill } from '@/components/ui/Pill';
import { FaqSection } from '@/components/ui/FaqSection';
import { offers } from '@/lib/content/offers';
import { cleFaqs, faqPageSchema } from '@/lib/content/faqs';
import {
  HERO_ID,
  CONTINUE_IDS,
  GENTLE_IDS,
} from '@/lib/content/offerDetails';
import { image } from '@/lib/images';
import { IMG_HERO_PORTRAIT } from '@/lib/images/keys';
import { site } from '@/lib/content/site';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Five ways to work with Nicole Hansult — from a single clinical evaluation to 12 weeks of in-person coaching in Carlsbad, CA.',
  alternates: { canonical: `${BASE_URL}/services` },
  openGraph: {
    title: 'Services — Nicole Hansult Coaching',
    description:
      'Five ways to work with Nicole Hansult — from a single clinical evaluation to 12 weeks of in-person coaching in Carlsbad, CA.',
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@graph': offers.map((offer) => ({
    '@type': 'Service',
    name: offer.name,
    provider: {
      '@type': 'LocalBusiness',
      name: site.nap.name,
    },
    offers: {
      '@type': 'Offer',
      price: offer.price,
      priceCurrency: 'USD',
    },
  })),
};

const faqSchema = faqPageSchema(cleFaqs);

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav />
      <main className="bg-bg">
        {/* Hero banner — image on top, heading and intro below (matches the
            other pages' treatment, e.g. Testimonials). */}
        <section className="mx-auto max-w-6xl px-6 pt-28 md:pt-32">
          <div className="relative min-h-[460px] md:min-h-[560px] overflow-hidden rounded-2xl bg-cardSoft">
            <Image
              src={image(IMG_HERO_PORTRAIT)}
              alt="Nicole Hansult, functional longevity coach in Carlsbad, CA"
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
              priority
            />
          </div>
        </section>

        {/* Hero heading */}
        <section className="mx-auto max-w-5xl px-6 pt-10 md:pt-12 pb-12">
          <h1 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            How You Can Work With Me
          </h1>
          <p className="text-inkSoft text-lg leading-relaxed mt-4 max-w-2xl">
            There isn&apos;t just one way to begin.
          </p>
          <p className="text-inkSoft text-lg leading-relaxed mt-3 max-w-2xl">
            Whether you&apos;re ready for a deeper understanding of your body, want guidance and
            accountability, or prefer to start more gradually, there is a clear path forward.
          </p>
        </section>

        <section className="mx-auto max-w-6xl space-y-12 px-6 pb-24">
          {/* Hero — the Clinical Longevity Evaluation, the recommended first step */}
          <OfferLadderCard id={HERO_ID} />

          {/* Tier 2 — where the CLE leads: ongoing in-person coaching */}
          <div className="space-y-12">
            <h2 className="text-grayDeep text-sm uppercase tracking-[0.14em]">
              Coaching that continues
            </h2>
            {CONTINUE_IDS.map((id) => (
              <OfferLadderCard key={id} id={id} />
            ))}
          </div>

          {/* Tier 3 — lower-commitment entry points */}
          <div className="space-y-12">
            <h2 className="text-grayDeep text-sm uppercase tracking-[0.14em]">
              Prefer to start gently?
            </h2>
            {GENTLE_IDS.map((id) => (
              <OfferLadderCard key={id} id={id} />
            ))}
          </div>

          {/* Free Guide secondary CTA — not a tier */}
          <div className="rounded-2xl bg-cardSoft border border-inkFaint p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-ink text-lg font-light">
                Not ready to book? Start with a free guide.
              </p>
              <p className="text-inkSoft text-sm">
                Download the free guide: How to Look and Feel Good Naked Over 40.
              </p>
            </div>
            <Pill href="/look-and-feel-good-naked" variant="orchid" size="md">
              Download Free Guide
            </Pill>
          </div>

          {/* FAQ — ported from the live Clinical Longevity Evaluation page */}
          <FaqSection items={cleFaqs} />
        </section>
      </main>
      <Footer />
    </>
  );
}
