/**
 * DarkCta — design-2.md §4 home composition, section 9 (final pre-Footer).
 *
 * Dark ink-on-bg section with single sky Pill CTA pointing at the CLE booking.
 */
import { Pill } from '@/components/ui/Pill';

export function DarkCta() {
  return (
    <section className="bg-ink text-bg px-6 py-28">
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <h2 className="text-bg text-4xl md:text-5xl font-light leading-tight">
          Ready to start?{' '}
          <span className="font-serif italic">Book the CLE.</span>
        </h2>
        <p className="text-bg/70 text-lg">
          Phase 1 placeholder CTA copy — Phase 2 ports the verbatim audit
          closing pitch.
        </p>
        <div className="flex justify-center">
          <Pill href="/booking-appointment" variant="sky" size="lg">
            Book the Clinical Longevity Evaluation
          </Pill>
        </div>
      </div>
    </section>
  );
}
