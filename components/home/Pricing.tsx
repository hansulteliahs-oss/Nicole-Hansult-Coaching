/**
 * Pricing — home page section: "Choose Your Best Starting Point".
 *
 * CLE-hero offer ladder. The Clinical Longevity Assessment is the visual hero
 * (full-width HeroOfferCard) — it's the funnel front door we push hardest.
 * Beneath it, the remaining offers are arranged as a top-to-bottom funnel:
 *   "Coaching that continues" → Personalized Training + 3-Month Program (the revenue)
 *   "Prefer to start gently?" → Strategy Session + Keep Your Muscle (free Skool community)
 *   Free Guide → secondary banner (not a tier), links to the free Skool group.
 *
 * CRITICAL: no inline price strings — all prices come from offers.ts priceLabel.
 * Presentation copy (features, badges, modality, grouping) comes from
 * offerDetails.ts, shared with /services so the two surfaces never drift.
 */
import { OfferLadderCard } from '@/components/offers/OfferLadderCard';
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { site } from '@/lib/content/site';
import {
  HERO_ID,
  CONTINUE_IDS,
  GENTLE_IDS,
} from '@/lib/content/offerDetails';

export function Pricing() {
  return (
    <section className="bg-bgAlt px-6 py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Label>Five ways to work with Nicole</Label>
          <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
            Choose Your Best Starting Point
          </h2>
        </div>

        {/* Hero — the Clinical Longevity Assessment, the funnel front door */}
        <OfferLadderCard id={HERO_ID} />

        {/* Tier 2 — where the CLE leads: ongoing in-person coaching */}
        <div className="space-y-12">
          <h3 className="text-grayDeep text-sm uppercase tracking-[0.14em]">
            Coaching that continues
          </h3>
          {CONTINUE_IDS.map((id) => (
            <OfferLadderCard key={id} id={id} />
          ))}
        </div>

        {/* Tier 3 — lower-commitment entry points */}
        <div className="space-y-12">
          <h3 className="text-grayDeep text-sm uppercase tracking-[0.14em]">
            Prefer to start gently?
          </h3>
          {GENTLE_IDS.map((id) => (
            <OfferLadderCard key={id} id={id} />
          ))}
        </div>

        {/* Free Guide secondary CTA — not a tier, kept below the grid */}
        <div className="rounded-2xl bg-cardSoft border border-inkFaint p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-ink text-lg font-light">
              Not ready to book? Start with a free guide.
            </p>
            <p className="text-inkSoft text-sm">
              How to Look and Feel Good Naked Over 40 is free inside Nicole&rsquo;s free community.
            </p>
          </div>
          <Pill
            href={site.freeCommunity.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="orchid"
            size="md"
          >
            Get the Free Guide
          </Pill>
        </div>
      </div>
    </section>
  );
}
