/**
 * Pricing — design-2.md §4 home composition, section 6.
 *
 * Two PricingCards: Strategy Session (default) + 3-Month Program (highlighted).
 * Pulled from offers[]. Modality strings reflect each tier's delivery context.
 * Features are PLACEHOLDER — Phase 2 ports verbatim audit features.
 */
import { Label } from '@/components/ui/Label';
import { PricingCard } from '@/components/ui/PricingCard';
import { offers } from '@/lib/content/offers';

const PLACEHOLDER_FEATURES = [
  'Phase 1 placeholder feature 1',
  'Phase 1 placeholder feature 2',
  'Phase 1 placeholder feature 3',
];

export function Pricing() {
  const strategy = offers.find((o) => o.id === 'strategy')!;
  const threeMonth = offers.find((o) => o.id === 'three-month')!;

  return (
    <section className="bg-bgAlt px-6 py-24">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Label>Two ways to go deeper</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            Strategy call{' '}
            <span className="font-serif italic">or</span> three-month program.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <PricingCard
            name={strategy.name}
            priceLabel={strategy.priceLabel}
            modality="45-min Zoom"
            blurb={strategy.blurb}
            features={PLACEHOLDER_FEATURES}
            ctaLabel={strategy.ctaLabel}
            ctaHref={strategy.ctaHref}
          />
          <PricingCard
            name={threeMonth.name}
            priceLabel={threeMonth.priceLabel}
            modality="In person · Carlsbad"
            blurb={threeMonth.blurb}
            features={PLACEHOLDER_FEATURES}
            ctaLabel={threeMonth.ctaLabel}
            ctaHref={threeMonth.ctaHref}
            highlighted
          />
        </div>
      </div>
    </section>
  );
}
