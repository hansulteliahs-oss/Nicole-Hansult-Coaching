/**
 * /look-and-feel-good-naked — Lead magnet landing page
 *
 * Server Component. Phase 2 ships layout + copy with a non-functional form UI.
 * Phase 3 adds the Server Action to process submissions via Resend.
 * No 'use client' — form is HTML-only in Phase 2.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Pill } from '@/components/ui/Pill';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Look and Feel Good Naked Over 40',
  description:
    'Download the free guide from Nicole Hansult — practical steps for feeling strong and confident in your body after 40.',
  alternates: { canonical: `${BASE_URL}/look-and-feel-good-naked` },
};

export default function LeadMagnetPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-2xl px-6 pt-24 pb-16">
          {/* Heading */}
          <h1 className="font-serif text-4xl text-ink md:text-5xl leading-tight">
            How to Look and Feel Good Naked Over 40
          </h1>

          {/* Subhead / guide description */}
          <p className="mt-6 text-inkSoft text-lg leading-relaxed">
            Download your free guide — get practical insights to improve your energy, mobility,
            and longevity without extreme diets or workouts.
          </p>

          {/* Guide contents */}
          <div className="mt-8 rounded-2xl bg-card border border-inkFaint p-6">
            <h2 className="text-ink font-medium text-base mb-4">The guide covers:</h2>
            <ul className="space-y-2 text-inkSoft">
              <li className="flex items-start gap-2">
                <span className="text-orchid mt-0.5">&#10003;</span>
                <span>Mindset development for confidence</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orchid mt-0.5">&#10003;</span>
                <span>Nutritious eating approaches</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orchid mt-0.5">&#10003;</span>
                <span>Mobility and core strengthening exercises</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orchid mt-0.5">&#10003;</span>
                <span>Hydration and sleep importance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orchid mt-0.5">&#10003;</span>
                <span>Daily stress-reduction practices</span>
              </li>
            </ul>
          </div>

          {/* Email capture form — non-functional in Phase 2; Phase 3 wires Server Action */}
          <div className="mt-10">
            <h2 className="text-ink font-medium text-xl mb-6">Download Your Free Guide</h2>
            <form action="#" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fname" className="block text-sm font-medium text-ink mb-1">
                    First Name
                  </label>
                  <input
                    id="fname"
                    name="fname"
                    type="text"
                    placeholder="First Name"
                    required
                    className="w-full bg-card border border-inkFaint rounded-xl px-4 py-3 text-ink placeholder-inkSoft focus:outline-none focus:ring-2 focus:ring-orchid"
                  />
                </div>
                <div>
                  <label htmlFor="lname" className="block text-sm font-medium text-ink mb-1">
                    Last Name
                  </label>
                  <input
                    id="lname"
                    name="lname"
                    type="text"
                    placeholder="Last Name"
                    required
                    className="w-full bg-card border border-inkFaint rounded-xl px-4 py-3 text-ink placeholder-inkSoft focus:outline-none focus:ring-2 focus:ring-orchid"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  required
                  className="w-full bg-card border border-inkFaint rounded-xl px-4 py-3 text-ink placeholder-inkSoft focus:outline-none focus:ring-2 focus:ring-orchid"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-pill bg-orchid text-white font-semibold px-6 py-4 text-[15px] tracking-[0.01em] transition-colors duration-180 hover:bg-orchidDeep"
              >
                Download the Free Guide
              </button>

              {/* Phase 3 note */}
              <p className="text-xs text-inkSoft text-center">
                Download link will be sent to your inbox.
              </p>
            </form>
          </div>

          {/* Secondary CTA */}
          <div className="mt-14 rounded-2xl bg-cardSoft border border-inkFaint p-8 text-center">
            <p className="text-inkSoft mb-4">Ready for a personalized plan?</p>
            <Pill href="/booking-appointment" variant="dark" size="md">
              Book a Strategy Session
            </Pill>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
