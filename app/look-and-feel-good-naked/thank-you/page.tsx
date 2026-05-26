/**
 * /look-and-feel-good-naked/thank-you
 *
 * Server Component. Shown after a visitor successfully submits the lead-magnet
 * form. Confirms the PDF is on its way and pitches the 45-Minute Strategy
 * Session as the immediate next step (FORM-07).
 *
 * Not indexed — this is a post-submission destination, not a discovery page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pill } from '@/components/ui/Pill';
import { Label } from '@/components/ui/Label';

export const metadata: Metadata = {
  title: 'Guide on its way — Nicole Hansult Coaching',
  description: 'Your free guide is on its way. Here is your next step.',
  robots: { index: false },
};

export default function LeadMagnetThankYouPage() {
  return (
    <main className="bg-bg">
      <section className="mx-auto max-w-2xl px-6 pt-24 pb-16">
        {/* Confirmation */}
        <div className="text-center">
          <h1 className="font-serif text-4xl text-ink md:text-5xl leading-tight">
            Check your inbox!
          </h1>
          <p className="mt-6 text-inkSoft text-lg leading-relaxed max-w-prose mx-auto">
            Your free guide is on its way. If you don&rsquo;t see it in a few
            minutes, check your spam folder.
          </p>
        </div>

        {/* Separator */}
        <div className="my-12 border-t border-inkFaint" />

        {/* Next-step pitch */}
        <div className="rounded-2xl bg-card border border-inkFaint p-8 text-center">
          <Label className="mb-4">Your next step</Label>

          <h2 className="font-serif text-2xl text-ink mt-3 mb-4 md:text-3xl leading-snug">
            Ready for a personalized plan?
          </h2>

          <p className="text-inkSoft text-base leading-relaxed max-w-prose mx-auto mb-8">
            The 45-Minute Strategy Session gives you a clear, actionable roadmap
            tailored to where you are right now — no guesswork, no generic advice.
          </p>

          <Pill href="/booking-appointment" variant="orchid" size="md">
            Book a Free Strategy Session
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
