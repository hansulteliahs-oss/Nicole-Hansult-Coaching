/**
 * /insights/[slug] — single blog post.
 *
 * Server Component. Fetches a published post from Supabase, renders the
 * Markdown body via the shared LessonBody renderer, emits SEO metadata +
 * BlogPosting JSON-LD. Unknown / unpublished slug → 404.
 *
 * Cached + tag-revalidated through lib/content/posts (tag 'blog' / 'blog:'+slug);
 * /api/revalidate refreshes it within seconds of publish.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Chip } from '@/components/ui/Chip';
import { Pill } from '@/components/ui/Pill';
import { LessonBody } from '@/components/vibrant40/LessonBody';
import { getPublishedPost, formatPostDate } from '@/lib/content/posts';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: 'Not found' };

  const title = post.seo_title ?? post.title;
  const description = post.meta_description ?? undefined;
  const url = `${BASE_URL}/insights/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      ...(post.hero_image_url ? { images: [post.hero_image_url] } : {}),
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const url = `${BASE_URL}/insights/${post.slug}`;
  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description ?? undefined,
    datePublished: post.published_at ?? undefined,
    image: post.hero_image_url ?? undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: 'Nicole Hansult' },
    publisher: { '@type': 'Organization', name: 'Nicole Hansult Coaching' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <Nav />
      <main className="bg-bg">
        <article className="mx-auto max-w-3xl px-6 pt-32 md:pt-40 pb-16">
          <div className="mb-6 flex items-center gap-3">
            <Chip tint="sky">{post.category ?? 'Functional Longevity'}</Chip>
            <span className="text-grayDeep text-xs">
              {formatPostDate(post.published_at)}
            </span>
          </div>
          <h1 className="font-serif text-4xl text-ink md:text-5xl mb-8 leading-tight">
            {post.title}
          </h1>

          <LessonBody body={post.body_md} />

          {/* Soft contextual CTA */}
          <div className="mt-12 rounded-2xl bg-card border border-inkFaint p-8 text-center">
            <p className="text-inkSoft mb-6 text-base">
              Ready to feel stronger and move better after 40?
            </p>
            <Pill href="/booking-appointment" variant="orchid" size="md">
              Book a Session
            </Pill>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
