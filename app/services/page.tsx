import type { Metadata } from 'next';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { PricingCard } from '@/components/ui/PricingCard';
import { offers } from '@/lib/content/offers';
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

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "What if the results show something isn't ideal?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "That's exactly why we do the evaluation. Most people already sense that something in their body feels different — they just don't have clear information about what's actually happening. The purpose of the scan and assessment is not to judge or criticize. It's to give us insight so we can build a practical plan that improves how your body functions over time. Many clients actually feel relieved once they understand what their body needs and realize there are clear steps they can take to improve it.",
      },
    },
    {
      '@type': 'Question',
      name: "What if I haven't exercised in years?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "You're in the right place. Many of my clients are returning to movement after long breaks. The goal is not intensity — it's building a foundation.",
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need to be fit to start?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely not. This evaluation is designed for people who feel unsure where to begin. We start exactly where you are.',
      },
    },
    {
      '@type': 'Question',
      name: 'I have an old injury. Is this safe?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. My background is in physiotherapy-based movement training, and the assessment is designed to be safe and appropriate for your current condition.',
      },
    },
    {
      '@type': 'Question',
      name: "I'm currently doing physical therapy or following a program. Should I wait until I'm done?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No—this is actually one of the best times to do the evaluation. We can capture a clear baseline of how your body is functioning right now and identify any underlying imbalances that may still be present. It also gives you a way to measure real progress over time—not just how you feel, but what's actually changing in your body.",
      },
    },
    {
      '@type': 'Question',
      name: "I'm taking a GLP-1 medication and have lost weight. How do I maintain it without losing strength?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "This is exactly where a more precise approach becomes important. While weight loss can happen quickly with medication, it often includes loss of muscle along with fat. The evaluation allows us to see your current muscle balance, metabolism, and overall body composition so we can focus on maintaining strength, supporting your metabolism, and protecting your long-term health.",
      },
    },
    {
      '@type': 'Question',
      name: "I'm currently dieting or trying to lose weight. Should I wait?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "You don't need to wait. The evaluation helps us understand how your body is responding right now—so we can support your efforts more effectively. Instead of guessing, we can see what's actually happening beneath the surface and adjust your approach in a way that supports long-term results.",
      },
    },
    {
      '@type': 'Question',
      name: "I want to lose some weight before coming in. Should I wait until I'm closer to my goal?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "There's no need to wait. In fact, starting now gives us a clear understanding of your current baseline so we can guide your progress more effectively. Your body doesn't need to be at a certain point to begin—this is where we create a plan that helps you move forward with clarity and confidence.",
      },
    },
    {
      '@type': 'Question',
      name: 'What should I wear?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Something comfortable that allows you to move easily. Gym clothes are not required.',
      },
    },
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
          {offers.map((offer) => {
            // Phase 5 Plan 02: Vibrant40 CTA POSTs to /api/checkout (Stripe Checkout Session).
            const isVibrant40 = offer.id === 'vibrant40';
            return (
              <PricingCard
                key={offer.id}
                name={offer.name}
                priceLabel={offer.priceLabel}
                modality={modalityLabel(offer.modality)}
                blurb={offer.blurb}
                features={featuresByOfferId[offer.id] ?? []}
                ctaLabel={isVibrant40 ? 'Buy Vibrant40 — $88' : offer.ctaLabel}
                ctaHref={offer.ctaHref}
                ctaFormAction={isVibrant40 ? '/api/checkout' : undefined}
                highlighted={offer.id === 'three-month'}
              />
            );
          })}
        </section>
      </main>
      <Footer />
    </>
  );
}
