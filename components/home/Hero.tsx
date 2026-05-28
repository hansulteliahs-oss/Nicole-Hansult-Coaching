/**
 * Hero — home page section 1.
 *
 * Full-bleed background image (matches live nicolehansultcoaching.com) with
 * left-aligned text overlay: eyebrow Label + H1 + supporting paragraph +
 * primary Pill CTA (dark) + secondary ghost Pill. Left-to-right dark gradient
 * keeps copy legible over the photo.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page.
 * Prices: none in this section — Pricing section is the sole price surface.
 */
import Image from 'next/image';

import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';

export function Hero() {
  return (
    <section className="relative bg-bg px-6 pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden min-h-[80vh] flex items-center">
      {/* Image + overlay are wrapped so the image starts BELOW the fixed nav,
          leaving a strip of page bg as visual buffer between nav and image. */}
      <div className="absolute inset-x-0 bottom-0 top-24 md:top-28">
        <Image
          src="/images/nicole-hero-marcy-browe.jpg"
          alt=""
          fill
          priority
          quality={85}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl w-full">
        <div className="max-w-xl space-y-6 text-white">
          <Label className="text-white/90">Functional longevity · Carlsbad, CA</Label>
          <h1 className="text-5xl md:text-6xl font-light leading-[1.05]">
            Stop Guessing What Your Body Needs After 40
          </h1>
          <p className="text-white/90 text-lg max-w-md">
            Feel strong, mobile, and confident again with a plan designed for
            your body.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Pill href="/booking-appointment" variant="orchid" size="lg">
              Start with a Clinical Longevity Evaluation
            </Pill>
            <Pill
              href="/services"
              variant="ghost"
              size="lg"
              className="!text-white !border-white hover:!bg-white hover:!text-ink"
            >
              Explore all services
            </Pill>
          </div>
        </div>
      </div>
    </section>
  );
}
