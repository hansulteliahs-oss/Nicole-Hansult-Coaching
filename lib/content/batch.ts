/**
 * Batch approval token resolution — server only.
 *
 * Decision 7: launch emails are batch-approved up front and scheduled in
 * Mailchimp. One batch_id, one token, one review sitting, no per-send tap.
 * Token expiry has killed two cycles at a monthly cadence and a 14-day cart
 * window cannot absorb a missed tap.
 *
 * The token is the RAW string in approval_tokens.token_hash — see the note at
 * the top of lib/content/approvals.ts. Do not add hashing.
 */
import { getAdminClient } from '@/lib/supabase/admin';
import type { ApprovalRejection } from '@/lib/content/approvals';

export type BatchDraft = {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  list_id: string;
  segment_id: string | null;
  scheduled_for: string | null;
  mailchimp_campaign_id: string | null;
};

export type BatchResolution =
  | { ok: true; drafts: BatchDraft[]; alreadyUsed: boolean }
  | { ok: false; reason: ApprovalRejection };

const reject = (reason: ApprovalRejection): BatchResolution => ({ ok: false, reason });

export async function resolveBatchToken(token: string): Promise<BatchResolution> {
  if (!token) return reject('missing');

  const admin = getAdminClient();

  const { data: tokenRow, error } = await admin
    .from('approval_tokens')
    .select('batch_id, used, expires_at')
    .eq('token_hash', token)
    .maybeSingle();

  if (error) {
    console.error(`[batch] token lookup failed: ${error.message}`);
    return reject('missing');
  }
  if (!tokenRow) return reject('missing');
  // A single-draft token on this page is a wrong link, not an expired one.
  if (!tokenRow.batch_id) return reject('missing');

  // A used token is NOT rejected here, unlike resolveApprovalToken. approve_batch
  // claims the token on the FIRST press but the batch route can still fail
  // partway through Mailchimp, leaving some drafts scheduled and some not. The
  // page has to be able to tell the truth on a refresh — how many still need
  // scheduling — rather than a blanket "already approved" that may be false.
  // An unclaimed token past its window is still a real rejection.
  if (!tokenRow.used && new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return reject('expired');
  }

  const { data, error: draftsError } = await admin
    .from('newsletter_drafts')
    .select('id, subject, preview_text, body_html, list_id, segment_id, scheduled_for, mailchimp_campaign_id')
    .eq('batch_id', tokenRow.batch_id)
    .order('scheduled_for', { ascending: true, nullsFirst: false });

  if (draftsError) {
    console.error(`[batch] draft load failed: ${draftsError.message}`);
    return reject('missing');
  }
  if (!data || data.length === 0) return reject('missing');

  return { ok: true, drafts: data as BatchDraft[], alreadyUsed: tokenRow.used };
}
