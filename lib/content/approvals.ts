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

export type ApprovalDraft =
  | { kind: 'post'; title: string; body_md: string }
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
      .select('title, body_md')
      .eq('id', tokenRow.draft_id)
      .maybeSingle();

    if (error || !data) return reject('missing');
    return {
      ok: true,
      draft: { kind: 'post', title: data.title, body_md: data.body_md },
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
