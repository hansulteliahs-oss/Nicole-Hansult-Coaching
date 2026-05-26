/**
 * Services — design-2.md §4 home composition, section 4.
 *
 * Five ServiceCards mapped from offers[] (lib/content/offers.ts).
 * Tints rotate sky → orchid → gray to differentiate cards visually.
 * Bullets are PLACEHOLDER — Phase 2 ports verbatim audit bullets.
 *
 * No pricing literals inline — single source of truth is offers[].
 */
import { Label } from '@/components/ui/Label';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { offers } from '@/lib/content/offers';

const TINTS = ['sky', 'orchid', 'gray', 'sky', 'orchid'] as const;
const PLACEHOLDER_BULLETS = [
  'Phase 1 placeholder bullet 1',
  'Phase 1 placeholder bullet 2',
  'Phase 1 placeholder bullet 3',
];

export function Services() {
  return (
    <section className="bg-bgAlt px-6 py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Label>Choose your best starting point</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            Five tiers,{' '}
            <span className="font-serif italic">one</span> way of working.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer, i) => (
            <ServiceCard
              key={offer.id}
              title={offer.name}
              blurb={offer.blurb}
              bullets={PLACEHOLDER_BULLETS}
              priceLabel={offer.priceLabel}
              ctaLabel={offer.ctaLabel}
              ctaHref={offer.ctaHref}
              tint={TINTS[i] ?? 'gray'}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
