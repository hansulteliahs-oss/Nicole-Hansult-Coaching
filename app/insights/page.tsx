/**
 * /insights — Blog index
 *
 * Server Component. 12 non-clickable post cards.
 * /insights/[slug] routes are v2 — no links in Phase 2.
 * Cards styled to match JournalCard design without the anchor wrapper.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Chip } from '@/components/ui/Chip';
import { Pill } from '@/components/ui/Pill';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Insights',
  description:
    'Functional longevity articles and resources from Nicole Hansult — Carlsbad, CA.',
  alternates: { canonical: `${BASE_URL}/insights` },
};

const POSTS = [
  {
    title: 'The 3 Biggest Mistakes People Make When Trying to "Get Back in Shape" After 40',
    date: 'Apr 28, 2026',
    category: 'Functional Longevity',
  },
  {
    title: "I'm Too Old to Start Exercising… Or Am I?",
    date: 'Mar 31, 2026',
    category: 'Longevity',
  },
  {
    title: 'Your Body Is Talking. Are You Listening?',
    date: 'Feb 25, 2026',
    category: 'Mobility',
  },
  {
    title: "Why the Scale Isn't Telling the Whole Story About Your Body After 40",
    date: 'Jan 29, 2026',
    category: 'Body Composition',
  },
  {
    title: 'December Reset: How to Take Care of Yourself Without Opting Out During the Holidays',
    date: 'Dec 18, 2025',
    category: 'Lifestyle',
  },
  {
    title: 'The Confidence Connection: How Better Posture Changes How Others See You',
    date: 'Nov 18, 2025',
    category: 'Mobility',
  },
  {
    title: 'The Fascia Factor: What It Is and Why It Could Be the Reason You Feel Stiff',
    date: 'Oct 24, 2025',
    category: 'Mobility',
  },
  {
    title: '3 Daily Stretches That Take You from Stiff and Sore to Confident and Strong',
    date: 'Sep 23, 2025',
    category: 'Mobility',
  },
  {
    title: 'Why Mobility Matters More Than Intense Workouts After 40',
    date: 'Aug 28, 2025',
    category: 'Longevity',
  },
  {
    title: 'Why Smart People Over 40 Are Rethinking Their Water Habits',
    date: 'Jul 2, 2025',
    category: 'Lifestyle',
  },
  {
    title: "Reclaiming Strength After 50: Karen's Story (and Why It's Never Too Late to Start)",
    date: 'Jun 5, 2025',
    category: 'Longevity',
  },
  {
    title: 'The Power of Mobility: Why It\'s the Key to Aging Gracefully',
    date: 'May 9, 2025',
    category: 'Mobility',
  },
];

export default function InsightsPage() {
  return (
    <>
      <Nav />
      <main className="bg-bg">
        {/* Header */}
        <section className="mx-auto max-w-5xl px-6 pt-32 md:pt-40 pb-12">
          <h1 className="font-serif text-4xl text-ink md:text-5xl">Insights</h1>
          <p className="mt-4 text-inkSoft text-lg">
            Articles on movement, nutrition, lifestyle, and longevity for adults 40+.
          </p>
        </section>

        {/* Post grid — display-only, no links (Phase 2 decision) */}
        <section className="mx-auto max-w-5xl px-6 pb-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post) => (
              <div
                key={post.title}
                className="rounded-2xl bg-card overflow-hidden border border-inkFaint"
              >
                {/* Placeholder image strip */}
                <div className="placeholder-stripes h-40 w-full" />
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Chip tint="sky">{post.category}</Chip>
                    <span className="text-grayDeep text-xs">{post.date}</span>
                  </div>
                  <h3 className="text-ink text-base font-medium leading-snug">
                    {post.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon note */}
          <p className="mt-8 text-xs text-inkSoft text-center">More insights coming soon.</p>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-inkSoft mb-6 text-base">
            Want practical longevity tips delivered to your inbox?
          </p>
          <Pill href="/look-and-feel-good-naked" variant="orchid" size="md">
            Download the Free Guide
          </Pill>
        </section>
      </main>
      <Footer />
    </>
  );
}
