/**
 * /services/three-month-coaching/thank-you
 *
 * Server Component shown after a visitor successfully submits the FORM-03
 * application. Not indexed — this is a post-submission destination. Plan B
 * CTA pitches the Strategy Session ($88) as the immediate warm option for
 * applicants who want to talk sooner than the 48-hour application turnaround.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pill } from '@/components/ui/Pill';
import { Label } from '@/components/ui/Label';

export const metadata: Metadata = {
  title: 'Application received — Nicole Hansult Coaching',
  description:
    'Your 3-Month Coaching Program application is in. Nicole will reply within 48 hours.',
  robots: { index: false },
};

export default function ThreeMonthApplicationThankYouPage() {
  return (
    <main className="bg-bg">
      <section className="mx-auto max-w-2xl px-6 pt-24 pb-16">
        {/* Confirmation */}
        <div className="text-center">
          <h1 className="font-serif text-4xl text-ink md:text-5xl leading-tight">
            Application received.
          </h1>
          <p className="mt-6 text-inkSoft text-lg leading-relaxed max-w-prose mx-auto">
            Thanks for applying to the 3-Month Coaching Program. Nicole reviews
            each application personally and will reply within 48 hours.
          </p>
        </div>

        {/* Separator */}
        <div className="my-12 border-t border-inkFaint" />

        {/* Plan B — Strategy Session pitch */}
        <div className="rounded-2xl bg-card border border-inkFaint p-8 text-center">
          <Label className="mb-4">Want to talk sooner?</Label>

          <h2 className="font-serif text-2xl text-ink mt-3 mb-4 md:text-3xl leading-snug">
            Book a Strategy Session in the meantime
          </h2>

          <p className="text-inkSoft text-base leading-relaxed max-w-prose mx-auto mb-8">
            A 45-minute Strategy Session ($88) gives you a clear next step on
            its own and credits toward the 3-Month Program if we move forward
            together.
          </p>

          <Pill href="/booking-appointment" variant="orchid" size="md">
            Book a Strategy Session
          </Pill>
        </div>

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm text-inkSoft hover:text-ink transition-colors duration-180"
          >
            &larr; Back to Nicole Hansult Coaching
          </Link>
        </div>
      </section>
    </main>
  );
}
