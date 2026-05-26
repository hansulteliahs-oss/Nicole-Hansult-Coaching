/**
 * Hero — home page section 1.
 *
 * Full-viewport hero. Left column: eyebrow Label + H1 (verbatim audit copy) +
 * supporting paragraph + single primary Pill CTA (dark) + secondary ghost Pill.
 * Right column: FloatingCard with hero portrait via image() resolver.
 * Decorative Orb glow sits absolutely behind, top-right.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page.
 * Prices: none in this section — Pricing section is the sole price surface.
 */
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';
import { FloatingCard } from '@/components/ui/FloatingCard';
import { Orb } from '@/components/ui/Orb';
import { image } from '@/lib/images';
import { IMG_HERO_PORTRAIT } from '@/lib/images/keys';

export function Hero() {
  return (
    <section className="relative bg-bg px-6 pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
      <Orb className="absolute -top-20 -right-20 -z-10" size={500} />
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <Label>Functional longevity · Carlsbad, CA</Label>
          <h1 className="text-ink text-5xl md:text-6xl font-light leading-[1.05]">
            Stop Guessing What Your Body Needs After 40
          </h1>
          <p className="text-inkSoft text-lg max-w-md">
            Feel strong, mobile, and confident again with a plan designed for
            your body.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Pill href="/booking-appointment" variant="dark" size="lg">
              Start with a Clinical Longevity Evaluation
            </Pill>
            <Pill href="/services" variant="ghost" size="lg">
              Explore all services
            </Pill>
          </div>
        </div>
        <div className="h-[560px]">
          <FloatingCard
            imageSrc={image(IMG_HERO_PORTRAIT)}
            alt="Nicole Hansult, functional longevity coach"
          />
        </div>
      </div>
    </section>
  );
}
