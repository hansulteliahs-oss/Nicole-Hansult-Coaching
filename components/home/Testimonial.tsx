/**
 * Testimonial — home page section 7: social proof teaser.
 *
 * 2 pull-quote testimonials, social proof badges, CTA to /testimonials.
 * Attribution uses Carlsbad CA — not the old city name.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Testimonials Page §Real Recovery Stories
 * and §Strength, Confidence & Energy sections.
 *
 * Images: IMG_TESTIMONIAL from keys.ts for the background card.
 * Full video testimonials live on /testimonials — not repeated here.
 */
import { FloatingCard } from '@/components/ui/FloatingCard';
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { image } from '@/lib/images';
import { IMG_TESTIMONIAL } from '@/lib/images/keys';

export function Testimonial() {
  return (
    <section className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="space-y-4">
          <Label>What clients say</Label>
        </div>

        {/* Two pull-quote testimonials */}
        <div className="grid md:grid-cols-2 gap-6">
          <blockquote className="rounded-2xl bg-card border border-inkFaint p-8 space-y-4">
            <p className="text-ink text-xl font-serif italic leading-relaxed">
              &ldquo;Nicole guided me through every step of my recovery after hip
              replacement surgery.&rdquo;
            </p>
            <footer className="text-grayDeep text-sm not-italic">
              — Mike S., Carlsbad, CA
            </footer>
          </blockquote>

          <blockquote className="rounded-2xl bg-card border border-inkFaint p-8 space-y-4">
            <p className="text-ink text-xl font-serif italic leading-relaxed">
              &ldquo;What I learned from Nicole completely changed my life for the long
              haul.&rdquo;
            </p>
            <footer className="text-grayDeep text-sm not-italic">
              — Brie M., Carlsbad, CA
            </footer>
          </blockquote>
        </div>

        {/* Social proof badges */}
        <div className="flex flex-wrap gap-4 items-center">
          <span className="rounded-full bg-cardSoft border border-inkFaint px-4 py-2 text-sm text-ink">
            Google Reviews ★★★★★
          </span>
          <span className="rounded-full bg-cardSoft border border-inkFaint px-4 py-2 text-sm text-ink">
            Yelp Reviews ★★★★★
          </span>
          <span className="rounded-full bg-cardSoft border border-inkFaint px-4 py-2 text-sm text-ink">
            Best Personal Trainer North County 2024
          </span>
          <span className="rounded-full bg-cardSoft border border-inkFaint px-4 py-2 text-sm text-ink">
            Best Local Fitness Influencer 2024
          </span>
        </div>

        {/* Video testimonial preview card */}
        <div className="h-[360px]">
          <FloatingCard
            imageSrc={image(IMG_TESTIMONIAL)}
            alt="Nicole Hansult coaching session"
          />
        </div>

        <Pill href="/testimonials" variant="ghost" size="md">
          See all client results
        </Pill>
      </div>
    </section>
  );
}
