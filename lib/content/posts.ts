/**
 * Blog posts — DB-backed loader (Phase 6 content pipeline).
 *
 * Posts live in Supabase `public.posts`; the public blog renders only
 * status='published' rows (enforced by RLS policy "published posts are public").
 *
 * Reads use a plain anon-key client (no cookies) wrapped in `unstable_cache`
 * so the result is statically cacheable and tag-invalidated. On publish, n8n
 * calls /api/revalidate which runs revalidateTag('blog') + the per-slug tag —
 * so a freshly published post appears within seconds without a redeploy.
 */
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export type Post = {
  slug: string;
  title: string;
  body_md: string;
  seo_title: string | null;
  meta_description: string | null;
  category: string | null;
  keyword: string | null;
  hero_image_url: string | null;
  faq: unknown;
  published_at: string | null;
  created_at: string;
};

const BLOG_TAG = 'blog';
const slugTag = (slug: string) => `blog:${slug}`;

/** Anon read client — RLS exposes only published posts. No cookies → cacheable. */
function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const POST_COLUMNS =
  'slug, title, body_md, seo_title, meta_description, category, keyword, hero_image_url, faq, published_at, created_at';

/**
 * All published posts, newest first — for /insights.
 * Degrades to [] on DB error so the page (and the build) never hard-crashes;
 * the index then shows its empty state instead of a 500.
 */
export const getPublishedPosts = unstable_cache(
  async (): Promise<Post[]> => {
    const { data, error } = await readClient()
      .from('posts')
      .select(POST_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error(`[posts] getPublishedPosts: ${error.message}`);
      return [];
    }
    return (data ?? []) as Post[];
  },
  ['published-posts'],
  { tags: [BLOG_TAG] },
);

/** One published post by slug, or null — for /insights/[slug]. */
export async function getPublishedPost(slug: string): Promise<Post | null> {
  const load = unstable_cache(
    async (s: string): Promise<Post | null> => {
      const { data, error } = await readClient()
        .from('posts')
        .select(POST_COLUMNS)
        .eq('status', 'published')
        .eq('slug', s)
        .maybeSingle();

      if (error) {
        console.error(`[posts] getPublishedPost(${s}): ${error.message}`);
        return null;
      }
      return (data as Post) ?? null;
    },
    ['published-post', slug],
    { tags: [BLOG_TAG, slugTag(slug)] },
  );
  return load(slug);
}

/** Published slugs — for sitemap + (optional) static params. */
export const getPublishedSlugs = unstable_cache(
  async (): Promise<{ slug: string; published_at: string | null }[]> => {
    const { data, error } = await readClient()
      .from('posts')
      .select('slug, published_at')
      .eq('status', 'published');

    if (error) {
      console.error(`[posts] getPublishedSlugs: ${error.message}`);
      return [];
    }
    return data ?? [];
  },
  ['published-slugs'],
  { tags: [BLOG_TAG] },
);

/** Human date for cards / post header. */
export function formatPostDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
