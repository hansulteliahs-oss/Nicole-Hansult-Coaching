/**
 * Mailchimp Marketing API helper — adds a contact to the newsletter audience.
 *
 * Used by:
 *   - lib/actions/lead-magnet.ts   (free-guide opt-in sync)
 *
 * Fail-soft by design: if the env vars are missing the helper no-ops with a
 * logged warning rather than throwing, so a misconfiguration can never break
 * the lead-magnet form. Callers wrap addSubscriber() in try/catch and treat a
 * failure as non-blocking (mirrors the Resend / Supabase backup pattern).
 */
import crypto from 'crypto';

const apiKey = process.env.MAILCHIMP_API_KEY;
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
// Mailchimp keys are suffixed with the data-center prefix, e.g. "abc123-us21".
const server = apiKey?.split('-')[1];

interface AddSubscriberArgs {
  email: string;
  firstName: string;
  lastName: string;
  /** Optional Mailchimp tag for segmentation (e.g. "Free Guide"). */
  tag?: string;
}

/**
 * Upsert a subscriber into the configured audience and (optionally) tag them.
 *
 * Idempotent: keyed by the MD5 of the lowercased email, so repeat submissions
 * update the same member. Uses `status_if_new` (not `status`) so we never try to
 * resurrect a contact who previously unsubscribed — that would 400 on
 * compliance grounds.
 *
 * Throws on a non-OK response so the caller can log; never call without a catch.
 */
export async function addSubscriber({ email, firstName, lastName, tag }: AddSubscriberArgs): Promise<void> {
  if (!apiKey || !audienceId || !server) {
    console.warn('[mailchimp] MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID not set — skipping sync');
    return;
  }

  const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  const auth = 'Basic ' + Buffer.from(`any:${apiKey}`).toString('base64');
  const memberUrl = `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members/${hash}`;

  // 1. Upsert the member.
  const upsert = await fetch(memberUrl, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_address: email,
      status_if_new: 'subscribed',
      merge_fields: { FNAME: firstName, LNAME: lastName },
    }),
  });

  if (!upsert.ok) {
    throw new Error(`Mailchimp upsert failed (${upsert.status}): ${await upsert.text()}`);
  }

  // 2. Tag for segmentation (separate call so it applies to existing members too).
  if (tag) {
    const tagRes = await fetch(`${memberUrl}/tags`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [{ name: tag, status: 'active' }] }),
    });

    if (!tagRes.ok) {
      throw new Error(`Mailchimp tag failed (${tagRes.status}): ${await tagRes.text()}`);
    }
  }
}
