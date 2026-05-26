/**
 * DarkCta — home page section 9 (final pre-Footer): "My Philosophy".
 *
 * Dark ink-on-bg band with philosophy copy verbatim from audit,
 * closing CTA to CLE booking.
 *
 * Copy: verbatim from CONTENT-AUDIT.md §Home Page §My Philosophy.
 */
import { Pill } from '@/components/ui/Pill';

export function DarkCta() {
  return (
    <section className="bg-ink text-bg px-6 py-28">
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <h2 className="text-bg text-4xl md:text-5xl font-light leading-tight">
          My Philosophy
        </h2>
        <p className="text-bg/80 text-lg leading-relaxed">
          Longevity is not about extreme workouts or chasing unrealistic fitness
          goals.
        </p>
        <p className="text-bg/80 text-lg leading-relaxed">
          It&apos;s about building a body that supports the life you want to live.
        </p>
        <p className="text-bg/70 text-base leading-relaxed">
          For some people, that means moving with more ease, having more energy,
          and feeling confident in their body again.
        </p>
        <p className="text-bg/70 text-base leading-relaxed">
          For others, it means refining what&apos;s already working — improving body
          composition, addressing imbalances, and continuing to feel strong and
          capable for years to come.
        </p>
        <p className="text-bg/70 text-base leading-relaxed">
          This is not about becoming someone else or comparing yourself to
          others. It&apos;s about improving what you already have so your body feels
          reliable, resilient, and aligned with the life you want to live.
        </p>
        <div className="flex justify-center pt-2">
          <Pill href="/booking-appointment" variant="sky" size="lg">
            Book a Clinical Longevity Evaluation
          </Pill>
        </div>
      </div>
    </section>
  );
}
