/**
 * /dev/components — gated component styleguide.
 *
 * Renders every base component × variant on a single page. Visual regression
 * surface for Phase 1 + 2 (and any future phase that touches Mist component chrome).
 *
 * Gating (locked decision: see CONTEXT.md):
 *   - `?key=<DEV_PREVIEW_KEY>` query param required.
 *   - Missing key, wrong key, OR missing env var → notFound() (404).
 *   - Page emits robots: { index: false, follow: false }.
 *   - app/robots.ts disallows /dev/* in addition to the meta tag.
 *
 * Server component — reads process.env. Nav is the only client child.
 *
 * Next 16: searchParams is async — type as Promise<…> and await it.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Footer } from '@/components/layout/Footer';
import { Nav } from '@/components/layout/Nav';
import { ApproachCard } from '@/components/ui/ApproachCard';
import { Chip } from '@/components/ui/Chip';
import { FloatingCard } from '@/components/ui/FloatingCard';
import { JournalCard } from '@/components/ui/JournalCard';
import { Label } from '@/components/ui/Label';
import { Orb } from '@/components/ui/Orb';
import { Pill } from '@/components/ui/Pill';
import { PricingCard } from '@/components/ui/PricingCard';
import { ServiceCard } from '@/components/ui/ServiceCard';

export const metadata: Metadata = {
  title: 'Component Styleguide (Internal)',
  robots: { index: false, follow: false },
};

const PILL_VARIANTS = [
  'dark',
  'light',
  'ghost',
  'sky',
  'orchid',
  'gray',
  'grayG',
] as const;
const PILL_SIZES = ['sm', 'md', 'lg'] as const;
const CHIP_TINTS = ['sky', 'orchid', 'gray'] as const;

export default async function ComponentStyleguide({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const expected = process.env.DEV_PREVIEW_KEY;

  // Treat missing env var as misconfiguration — never accidentally expose the
  // styleguide. Both an unset key and a wrong key produce identical 404s.
  if (!expected || !key || key !== expected) {
    notFound();
  }

  return (
    <main className="bg-bg min-h-screen px-8 py-16">
      <div className="mx-auto max-w-6xl space-y-16">
        <header>
          <Label>Internal — Phase 1</Label>
          <h1 className="text-ink text-4xl font-light mt-2">
            Component Styleguide
          </h1>
          <p className="text-inkSoft mt-2 text-sm">
            Every base component × variant. Visual regression surface.
          </p>
        </header>

        {/* Pill — 7 variants × 3 sizes */}
        <section className="space-y-6">
          <h2 className="text-ink text-2xl font-light">Pill</h2>
          {PILL_VARIANTS.map((v) => (
            <div key={v} className="flex items-center gap-4 flex-wrap">
              <span className="text-grayDeep text-xs w-16">{v}</span>
              {PILL_SIZES.map((s) => (
                <Pill key={s} variant={v} size={s}>
                  Click me
                </Pill>
              ))}
            </div>
          ))}
        </section>

        {/* Chip — 3 tints */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">Chip</h2>
          <div className="flex gap-3 flex-wrap">
            {CHIP_TINTS.map((t) => (
              <Chip key={t} tint={t}>
                {t}
              </Chip>
            ))}
          </div>
        </section>

        {/* Orb */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">Orb</h2>
          <div className="relative h-[400px] bg-cardSoft rounded-2xl overflow-hidden flex items-center justify-center">
            <Orb />
          </div>
        </section>

        {/* Label */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">Label (eyebrow)</h2>
          <Label>Functional longevity coaching</Label>
        </section>

        {/* FloatingCard */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">FloatingCard</h2>
          <div className="h-[400px] max-w-md">
            <FloatingCard />
          </div>
        </section>

        {/* ServiceCard */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">ServiceCard</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ServiceCard
              title="Clinical Longevity Evaluation"
              blurb="A single-session baseline — body composition + movement screen + plan."
              bullets={[
                'Seca body composition',
                'Movement screen',
                'Plan you walk out with',
              ]}
              priceLabel="$299.99"
              ctaLabel="Book the CLE"
              ctaHref="#"
              tint="sky"
            />
            <ServiceCard
              title="Vibrant40 Jumpstart"
              blurb="Eight-week self-paced foundation."
              bullets={[
                'Weekly modules',
                'Mobile-friendly video',
                'Lifetime access',
              ]}
              priceLabel="$88"
              ctaLabel="Start Vibrant40"
              ctaHref="#"
              tint="orchid"
            />
          </div>
        </section>

        {/* ApproachCard — row of 4 */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">
            ApproachCard (row of 4)
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {(['01', '02', '03', '04'] as const).map((n, i) => (
              <ApproachCard
                key={n}
                number={n}
                title={['Assess', 'Plan', 'Train', 'Adjust'][i]}
                blurb="One sentence of approach copy lives here."
              />
            ))}
          </div>
        </section>

        {/* PricingCard — default + highlighted */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">PricingCard</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <PricingCard
              name="Strategy Session"
              priceLabel="$88"
              modality="45-min Zoom"
              blurb="A focused planning call — credits toward 3-Month."
              features={[
                '45-minute Zoom',
                'Recap email',
                '$88 credit if you continue',
              ]}
              ctaLabel="Book a Strategy Session"
              ctaHref="#"
            />
            <PricingCard
              name="3-Month Program"
              priceLabel="$5,500"
              modality="In person · Carlsbad"
              blurb="Twelve weeks of in-person coaching — application only."
              features={[
                'Weekly 1:1',
                'Programming + check-ins',
                'Body comp re-test at 90 days',
              ]}
              ctaLabel="Apply"
              ctaHref="#"
              highlighted
            />
          </div>
        </section>

        {/* JournalCard */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">JournalCard</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {['Strength', 'Recovery', 'Nutrition'].map((cat) => (
              <JournalCard
                key={cat}
                title={`Sample title about ${cat.toLowerCase()}`}
                category={cat}
                date="May 2026"
                href="#"
              />
            ))}
          </div>
        </section>

        {/* Nav + Footer */}
        <section className="space-y-4">
          <h2 className="text-ink text-2xl font-light">
            Nav (live — top of viewport)
          </h2>
          <p className="text-inkSoft text-sm">
            Nav renders fixed at the top of this page. Resize to &lt;768 to see
            the mobile menu state.
          </p>
        </section>
      </div>

      <Nav />
      <Footer />
    </main>
  );
}
