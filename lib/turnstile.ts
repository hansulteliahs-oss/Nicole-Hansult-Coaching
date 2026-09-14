/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Why this exists: the contact form's off-screen honeypot and per-IP rate limit
 * were both bypassed by a browser-driven spam bot (481 submissions, 2026-09-11
 * to 2026-09-13). It renders the real page, so it skips the hidden field, and
 * it paced itself at ~20/hour to stay under the 5-per-60s limit. Turnstile adds
 * the one check a bot cannot satisfy by behaving politely: a token minted by
 * Cloudflare for that specific visitor and validated server-side here.
 */
export const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteverifyResponse = {
  success?: boolean;
  'error-codes'?: string[];
};

/**
 * Returns whether a submission may proceed.
 *
 * Unconfigured (no `TURNSTILE_SECRET_KEY`) returns `true` so this code can ship
 * ahead of the key without taking the form offline. Configured, it fails
 * closed: a missing token, a failure verdict, or a Cloudflare outage all reject.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await res.json()) as SiteverifyResponse;
    if (data.success !== true) {
      console.warn('[turnstile] rejected:', data['error-codes'] ?? 'no error codes');
      return false;
    }
    return true;
  } catch (err) {
    console.error('[turnstile] siteverify call failed:', err);
    return false;
  }
}
