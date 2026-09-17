/**
 * Links inside a newsletter body that point back at this site's posts.
 *
 * The weekly newsletter is a repurpose of that week's post, so its one link is
 * /insights/<slug>. The post and the newsletter are approved separately, and
 * a newsletter approved before its post publishes would send 1,157 people to
 * a 404. Both approve routes call this BEFORE claiming a token, so the same
 * link works again once the post is live.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const INSIGHTS_LINK = /\/insights\/([a-z0-9][a-z0-9-]*)/gi;

export function insightsSlugs(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(INSIGHTS_LINK)) out.add(m[1].toLowerCase());
  return [...out];
}

/**
 * Slugs linked from `html` (one body or several) that are not published.
 * Throws if the posts table cannot be read: refusing is safer than sending
 * blind.
 */
export async function unpublishedInsightsSlugs(
  admin: SupabaseClient,
  html: string | string[],
): Promise<string[]> {
  const slugs = insightsSlugs(Array.isArray(html) ? html.join('\n') : html);
  if (slugs.length === 0) return [];

  const { data, error } = await admin
    .from('posts')
    .select('slug')
    .in('slug', slugs)
    .eq('status', 'published');

  if (error) {
    throw new Error(`could not check linked posts: ${error.message}`);
  }
  const published = new Set(((data ?? []) as { slug: string }[]).map((r) => r.slug));
  return slugs.filter((s) => !published.has(s));
}
