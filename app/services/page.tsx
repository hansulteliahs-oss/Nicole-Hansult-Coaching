import type { Metadata } from 'next';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { PricingCard } from '@/components/ui/PricingCard';
import { offers } from '@/lib/content/offers';

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

const featuresByOfferId: Record<string, string[]> = {
  cle: [
    'Medical-grade body composition analysis (Seca mBCA)',
    'Mobility and movement assessment',
    'Review of key health and recovery indicators',
    'Personalized Longevity Roadmap with clear next steps',
  ],
  vibrant40: [
    'Eight weeks of self-paced online content',
    'Guided movement programming',
    'Nutrition and lifestyle foundations',
    'Accessible for adults 40+ starting from any fitness level',
  ],
  strategy: [
    'Focused 45-minute planning call via Zoom',
    'Personalized strategy for your goals and schedule',
    'Accountability and direction',
    '$88 credits toward the 3-Month Program if booked after',
  ],
  'three-month': [
    'Twelve weeks of in-person coaching in Carlsbad, CA',
    'Weekly sessions tailored to your Longevity Roadmap',
    'Nutrition, movement, lifestyle, and mindset support',
    'Application only — not a cart checkout',
  ],
  'everyday-training': [
    'Drop-in hourly in-person training sessions',
    'Structured for existing clients with a plan',
    'In-person in Carlsbad, CA',
    'No long-term commitment required',
  ],
};

function modalityLabel(m: string): string {
  if (m === 'in-person') return 'In-person · Carlsbad, CA';
  if (m === 'online-self-paced') return 'Online · Self-paced';
  if (m === 'zoom') return 'Zoom · 45 minutes';
  return m;
}

export default function ServicesPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-12">
          <h1 className="text-4xl font-light mb-4">How You Can Work With Me</h1>
          <p className="text-inkSoft text-lg leading-relaxed">
            There isn&apos;t just one way to begin.
          </p>
          <p className="text-inkSoft text-lg leading-relaxed mt-2">
            Whether you&apos;re ready for a deeper understanding of your body, want guidance and
            accountability, or prefer to start more gradually, there is a clear path forward.
          </p>
        </section>
        <section className="mx-auto max-w-3xl space-y-8 px-6 pb-24">
          {offers.map((offer) => (
            <PricingCard
              key={offer.id}
              name={offer.name}
              priceLabel={offer.priceLabel}
              modality={modalityLabel(offer.modality)}
              blurb={offer.blurb}
              features={featuresByOfferId[offer.id] ?? []}
              ctaLabel={offer.ctaLabel}
              ctaHref={offer.ctaHref}
              highlighted={offer.id === 'three-month'}
            />
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
