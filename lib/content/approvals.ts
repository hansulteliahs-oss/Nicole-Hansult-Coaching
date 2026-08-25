/**
 * Approval token resolution — server only.
 *
 * `/approve` used to render nothing but a button; the draft lived in the
 * preview email. Once the notification moves to SMS there is no email, so this
 * page becomes the only place Nicole can read what she is approving.
 *
 * IMPORTANT: `approval_tokens.token_hash` stores the RAW token, not a hash.
 * `Mint Token` / `Mint News Token` in n8n both do `token_hash: raw`, and
 * `Claim Token` matches on it directly. The column comment in
 * supabase/migrations/003_content_pipeline.sql:96 describes an intent that was
 * never implemented. Do not add hashing here — it would break `Claim Token`.
 *
 * No new exposure: the token already authorises publishing, so letting it also
 * read the draft is strictly weaker than what it could already do.
 */
import { getAdminClient } from '@/lib/supabase/admin';

export type ApprovalRejection = 'missing' | 'used' | 'expired';

/**
 * The post variant carries every field `app/insights/[slug]/page.tsx`
 * publishes, not just the ones that render in the body. `seo_title`,
 * `meta_description`, `category` and `hero_image_url` are all written by the
 * same LLM step and all go public under Nicole's name — a `meta_description`
 * is literally the sentence a stranger reads about her in a search result.
 * Previewing only title and body would leave "nothing ships unseen" false.
 *
 * All four are nullable in the schema, so absence is itself information worth
 * showing her: it means the post publishes with no search snippet and no share
 * image.
 */
export type ApprovalDraft =
  | {
      kind: 'post';
      title: string;
      slug: string;
      body_md: string;
      seo_title: string | null;
      meta_description: string | null;
      category: string | null;
      hero_image_url: string | null;
    }
  | {
      kind: 'newsletter';
      subject: string;
      preview_text: string | null;
      body_html: string;
    };

export type ApprovalResolution =
  | { ok: true; draft: ApprovalDraft }
  | { ok: false; reason: ApprovalRejection };

const reject = (reason: ApprovalRejection): ApprovalResolution => ({
  ok: false,
  reason,
});

export async function resolveApprovalToken(
  token: string,
): Promise<ApprovalResolution> {
  if (!token) return reject('missing');

  const admin = getAdminClient();

  const { data: tokenRow, error: tokenError } = await admin
    .from('approval_tokens')
    .select('token_hash, draft_kind, draft_id, used, expires_at')
    .eq('token_hash', token)
    .maybeSingle();

  if (tokenError) {
    console.error(`[approvals] token lookup failed: ${tokenError.message}`);
    return reject('missing');
  }
  if (!tokenRow) return reject('missing');

  // `used` is checked before `expires_at` on purpose: a token that was
  // approved and has since aged past its window should read as "already
  // approved", which is the true and more useful thing to tell the reader.
  if (tokenRow.used) return reject('used');
  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return reject('expired');
  }

  if (tokenRow.draft_kind === 'post') {
    const { data, error } = await admin
      .from('posts')
      .select(
        'title, slug, body_md, seo_title, meta_description, category, hero_image_url',
      )
      .eq('id', tokenRow.draft_id)
      .maybeSingle();

    if (error || !data) return reject('missing');
    return {
      ok: true,
      draft: {
        kind: 'post',
        title: data.title,
        slug: data.slug,
        body_md: data.body_md,
        seo_title: data.seo_title ?? null,
        meta_description: data.meta_description ?? null,
        category: data.category ?? null,
        hero_image_url: data.hero_image_url ?? null,
      },
    };
  }

  if (tokenRow.draft_kind === 'newsletter') {
    const { data, error } = await admin
      .from('newsletter_drafts')
      .select('subject, preview_text, body_html')
      .eq('id', tokenRow.draft_id)
      .maybeSingle();

    if (error || !data) return reject('missing');
    return {
      ok: true,
      draft: {
        kind: 'newsletter',
        subject: data.subject,
        preview_text: data.preview_text,
        body_html: data.body_html,
      },
    };
  }

  return reject('missing');
}
