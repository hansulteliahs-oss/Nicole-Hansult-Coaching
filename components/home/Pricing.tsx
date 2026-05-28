/**
 * Pricing — home page section 6: "Choose Your Best Starting Point".
 *
 * Renders ALL 5 offers from offers.ts as a 2-col card grid (desktop), 1-col (mobile).
 * The 3-Month Program card is visually distinguished with the "highlighted" variant
 * and an "Application Only" chip.
 *
 * CRITICAL: no inline price strings — all prices come from offers.ts priceLabel.
 * The "Free Guide" is a secondary CTA below the grid, NOT a tier card.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page §Choose Your Best Starting Point.
 */
import { Label } from '@/components/ui/Label';
import { Chip } from '@/components/ui/Chip';
import { Pill } from '@/components/ui/Pill';
import { offers } from '@/lib/content/offers';
import { cn } from '@/lib/cn';

const OFFER_BEST_FOR: Record<string, string[]> = {
  cle: [
    'data + clarity',
    'body composition insights',
    'pain/mobility concerns',
    'personalized strategy',
  ],
  vibrant40: [
    'building sustainable habits',
    'consistency',
    'guided movement',
    'starting simply',
  ],
  strategy: [
    'getting unstuck',
    'creating a realistic plan',
    'accountability + direction',
    'discussing goals & challenges',
  ],
  'three-month': [
    'deep, sustained transformation',
    'full four-pillar integration',
    'ongoing accountability',
    'application-based partnership',
  ],
  'everyday-training': [
    'existing clients seeking flexibility',
    'drop-in hourly sessions',
    'no long-term commitment',
    'in-person Carlsbad sessions',
  ],
};

const OFFER_BADGE: Record<string, string> = {
  cle: 'Most Personalized',
  strategy: 'Best Next Step',
};

const OFFER_MODALITY_LABEL: Record<string, string> = {
  cle: 'In person · Carlsbad',
  vibrant40: '8-day self-paced online',
  strategy: '45-min Zoom',
  'three-month': 'In person · Carlsbad',
  'everyday-training': 'In person · Carlsbad',
};

export function Pricing() {
  return (
    <section className="bg-bgAlt px-6 py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Label>All five ways to work with Nicole</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            Choose Your Best Starting Point
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {offers.map((offer) => {
            const isHighlighted = offer.id === 'three-month';
            const badge = OFFER_BADGE[offer.id];
            const bestFor = OFFER_BEST_FOR[offer.id] ?? [];
            const modality = OFFER_MODALITY_LABEL[offer.id] ?? '';

            return (
              <article
                key={offer.id}
                className={cn(
                  'rounded-2xl p-8 border flex flex-col gap-5',
                  isHighlighted
                    ? 'bg-ink text-bg border-ink shadow-card'
                    : 'bg-card text-ink border-inkFaint',
                )}
              >
                <header className="space-y-2">
                  {badge && (
                    <Chip tint={isHighlighted ? 'orchid' : 'sky'}>
                      {badge}
                    </Chip>
                  )}
                  {offer.id === 'three-month' && (
                    <Chip tint="orchid">Application Only</Chip>
                  )}
                  <h3
                    className={cn(
                      'text-2xl font-light',
                      isHighlighted ? 'text-bg' : 'text-ink',
                    )}
                  >
                    {offer.name}
                  </h3>
                  <p
                    className={cn(
                      'text-xs uppercase tracking-[0.14em]',
                      isHighlighted ? 'text-bg/70' : 'text-grayDeep',
                    )}
                  >
                    {modality}
                  </p>
                </header>

                <p
                  className={cn(
                    'text-4xl font-light',
                    isHighlighted ? 'text-bg' : 'text-ink',
                  )}
                >
                  {offer.priceLabel}
                </p>

                <div className="space-y-2">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isHighlighted ? 'text-bg/80' : 'text-ink',
                    )}
                  >
                    Best for:
                  </p>
                  <ul
                    className={cn(
                      'space-y-1 text-sm',
                      isHighlighted ? 'text-bg/80' : 'text-inkSoft',
                    )}
                  >
                    {bestFor.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {offer.id === 'vibrant40' ? (
                  // Phase 5 Plan 02: Vibrant40 CTA POSTs to /api/checkout (Stripe Checkout).
                  <form
                    action="/api/checkout"
                    method="POST"
                    className="self-start mt-auto"
                  >
                    <Pill
                      variant={isHighlighted ? 'sky' : 'orchid'}
                      size="md"
                      type="submit"
                    >
                      Buy Vibrant40 — $88
                    </Pill>
                  </form>
                ) : (
                  <Pill
                    href={offer.ctaHref}
                    variant={isHighlighted ? 'sky' : 'orchid'}
                    size="md"
                    className="self-start mt-auto"
                  >
                    {offer.ctaLabel}
                  </Pill>
                )}
              </article>
            );
          })}
        </div>

        {/* Free Guide secondary CTA — not a tier, kept below the grid */}
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
      </div>
    </section>
  );
}
