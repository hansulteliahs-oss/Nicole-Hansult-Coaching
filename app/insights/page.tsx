/**
 * /insights — Blog index.
 *
 * Server Component. Renders published posts from Supabase via clickable
 * JournalCards. Empty bank → a friendly "coming soon" note (no error).
 * Revalidated on publish by /api/revalidate (tag 'blog').
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { JournalCard } from '@/components/ui/JournalCard';
import { Pill } from '@/components/ui/Pill';
import { getPublishedPosts, formatPostDate } from '@/lib/content/posts';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export const metadata: Metadata = {
  title: 'Insights',
  description:
    'Functional longevity articles and resources from Nicole Hansult — Carlsbad, CA.',
  alternates: { canonical: `${BASE_URL}/insights` },
};

export default async function InsightsPage() {
  const posts = await getPublishedPosts();

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

        {/* Post grid */}
        <section className="mx-auto max-w-5xl px-6 pb-8">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <JournalCard
                  key={post.slug}
                  title={post.title}
                  category={post.category ?? 'Functional Longevity'}
                  date={formatPostDate(post.published_at)}
                  imageSrc={post.hero_image_url ?? undefined}
                  href={`/insights/${post.slug}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-inkSoft text-center py-12">
              New insights are on the way — check back soon.
            </p>
          )}

          {posts.length > 0 && (
            <p className="mt-8 text-xs text-inkSoft text-center">More insights coming soon.</p>
          )}
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
