/**
 * Hero — design-2.md §4 home composition, section 1.
 *
 * Full-viewport hero. Left column: eyebrow Label + headline (with italic-serif
 * emphasis on "decades") + paragraph + dual Pill CTA (dark primary + ghost
 * secondary). Right column: FloatingCard with hero portrait via image() resolver.
 * Decorative Orb glow sits absolutely behind, top-right.
 *
 * All copy is PLACEHOLDER for Phase 1. Phase 2 swaps in audit copy.
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
            Train for the{' '}
            <span className="font-serif italic">decades</span> ahead, not the
            next six weeks.
          </h1>
          <p className="text-inkSoft text-lg max-w-md">
            Phase 1 placeholder copy — Phase 2 ports the verbatim audit
            headline and supporting paragraph.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Pill href="/booking-appointment" variant="dark" size="lg">
              Book a Strategy Session
            </Pill>
            <Pill href="/services" variant="ghost" size="lg">
              See all services
            </Pill>
          </div>
        </div>
        <div className="h-[560px]">
          <FloatingCard
            imageSrc={image(IMG_HERO_PORTRAIT)}
            alt="Nicole Hansult, coach"
          />
        </div>
      </div>
    </section>
  );
}
