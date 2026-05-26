/**
 * Services — home page section 4: "Start With a Clear Plan".
 *
 * CLE intro section on the home page. Introduces the Clinical Longevity
 * Evaluation as the recommended starting point, with the 4-bullet "During the
 * evaluation, we will:" list.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page §Start With a Clear Plan.
 * Prices: none in this section — prices are sourced from offers.ts and surface
 * only in the Pricing section below.
 */
import { Label } from '@/components/ui/Label';
import { Pill } from '@/components/ui/Pill';

export function Services() {
  return (
    <section className="bg-bgAlt px-6 py-24">
      <div className="mx-auto max-w-4xl space-y-8">
        <Label>The starting point</Label>
        <h2 className="text-ink text-4xl md:text-5xl font-light leading-tight">
          Start With a Clear Plan
        </h2>
        <p className="text-inkSoft text-lg max-w-2xl">
          The best way to begin is with a Clinical Longevity Evaluation —
          giving us the insight needed to build a personalized strategy for
          your body.
        </p>
        <p className="text-grayDeep text-sm uppercase tracking-[0.14em]">
          75 minutes &middot; movement &middot; body composition &middot; lifestyle
        </p>
        <div className="space-y-4">
          <p className="text-ink text-base font-medium">
            During the evaluation, we will:
          </p>
          <ul className="space-y-2 text-inkSoft text-base max-w-xl">
            <li className="flex gap-2">
              <span>•</span>
              <span>analyze your body composition using medical-grade technology</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>assess mobility and movement patterns</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>review key health indicators</span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>identify the most important areas to focus on first</span>
            </li>
          </ul>
        </div>
        <p className="text-inkSoft text-base max-w-xl">
          You will leave with clear next steps and a better understanding of
          how to support your body moving forward.
        </p>
        <Pill href="/booking-appointment" variant="dark" size="lg">
          Book a Clinical Longevity Evaluation
        </Pill>
      </div>
    </section>
  );
}
