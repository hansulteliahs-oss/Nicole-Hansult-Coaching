import type { Metadata } from 'next';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Pill } from '@/components/ui/Pill';
import { offers } from '@/lib/content/offers';
import { site } from '@/lib/content/site';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: '3-Month Coaching Program',
  description:
    'Twelve weeks of in-person functional longevity coaching in Carlsbad, CA. $5,500. Application-only.',
  alternates: { canonical: `${BASE_URL}/services/three-month-coaching` },
  openGraph: {
    title: '3-Month Coaching Program — Nicole Hansult Coaching',
    description:
      'Twelve weeks of in-person functional longevity coaching in Carlsbad, CA. $5,500. Application-only.',
  },
};

const threeMonth = offers.find((o) => o.id === 'three-month')!;
const strategySession = offers.find((o) => o.id === 'strategy')!;

export default function ThreeMonthCoachingPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
          {/* Hero */}
          <h1 className="text-4xl font-light mb-3">{threeMonth.name}</h1>
          <p className="text-sm uppercase tracking-[0.14em] text-grayDeep mb-10">
            {threeMonth.priceLabel} &middot; In-person &middot; Carlsbad, CA &middot; Application only
          </p>

          {/* Body sections — AI draft in Nicole's voice */}
          <div className="space-y-10 text-base leading-relaxed">

            {/* What this is */}
            <div className="space-y-3">
              <h2 className="text-2xl font-light text-ink">What this is</h2>
              <p className="text-inkSoft">
                Twelve weeks of in-person, 1:1 coaching working across all four pillars of
                longevity: movement, nutrition, lifestyle, and mindset. Each week is built around
                your Clinical Longevity Roadmap — the personalized strategy we create from your
                Seca scan and movement assessment.
              </p>
              <p className="text-inkSoft">
                This is not a generic program. The plan adapts to what your body is doing each
                week. Progress is measured, not assumed.
              </p>
            </div>

            {/* Who it's for */}
            <div className="space-y-3">
              <h2 className="text-2xl font-light text-ink">Who it&apos;s for</h2>
              <p className="text-inkSoft">
                People who have completed the Clinical Longevity Evaluation or a Strategy Session
                and are ready for sustained, structured progress. You have a clear baseline. Now
                you want someone to help you apply it consistently over time.
              </p>
              <p className="text-inkSoft">
                This is not a good fit for someone who prefers self-paced or is still exploring
                options. Start with the CLE or a Strategy Session if you&apos;re not sure.
              </p>
            </div>

            {/* The $88 credit */}
            <div className="space-y-3">
              <h2 className="text-2xl font-light text-ink">The {strategySession.priceLabel} credit</h2>
              <p className="text-inkSoft">
                If you&apos;ve already had a Strategy Session, the {strategySession.priceLabel} fee
                credits toward the {threeMonth.priceLabel} program cost. No extra step needed — just
                mention it in your application.
              </p>
            </div>

            {/* How to apply */}
            <div className="space-y-3">
              <h2 className="text-2xl font-light text-ink">How to apply</h2>
              <p className="text-inkSoft">
                A short application ensures we&apos;re a good fit before we commit to 12 weeks
                together. Nicole reviews each application personally. There&apos;s no automated
                checkout — this is a deliberate process.
              </p>
            </div>

          </div>

          {/* Phase 2 CTA — application form wired in Phase 5 */}
          <div className="mt-10 flex flex-col items-start gap-4" id="apply">
            <Pill href="#apply" variant="dark" size="md">
              Apply for the 3-Month Program
            </Pill>
            <p className="text-sm text-inkSoft leading-relaxed max-w-prose">
              The application form will be available here shortly. In the meantime, email{' '}
              <a
                href={`mailto:${site.contactEmail}`}
                className="underline underline-offset-2 hover:text-ink transition-colors"
              >
                {site.contactEmail}
              </a>{' '}
              to express interest.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
