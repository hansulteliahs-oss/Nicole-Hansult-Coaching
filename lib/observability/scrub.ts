/**
 * Redacts approval tokens before anything reaches a third-party observability
 * service.
 *
 * `/approve?token=<raw>` carries a bearer credential in its query string.
 * `approval_tokens.token_hash` stores that token in plaintext and n8n's
 * `Claim Token` matches on it directly, so whoever holds the raw value can
 * POST /api/approve and publish a post — or send the newsletter to the full
 * ~1,110-person list, which cannot be recalled. Tokens stay valid for 14 days.
 *
 * Sentry's browser SDK attaches the full page URL to events, to pageload
 * transactions, and to navigation breadcrumbs. Without this, every sampled
 * /approve visit copies a live credential into a log store we do not control.
 *
 * Structural types rather than Sentry's own: this stays a pure function so the
 * tests can run it without booting the SDK.
 */
/**
 * URL-safe on purpose: `URLSearchParams.set` percent-encodes anything else,
 * which would leave `%5Bredacted%5D` in the Sentry UI. Uppercase so it cannot
 * be mistaken for a real token, which is 40 lowercase hex characters.
 */
export const REDACTED = 'REDACTED';

/** Query params that are credentials, not diagnostics. */
export const SENSITIVE_QUERY_PARAMS = ['token'] as const;

/**
 * Deliberately minimal: only the fields this touches, and no index signature.
 * Sentry's own `RequestEventData` and `Breadcrumb` have no index signature, so
 * requiring one here would make their `Event` types fail to satisfy the
 * constraint.
 */
type Breadcrumb = {
  data?: Record<string, unknown> | undefined;
};

export type ScrubbableEvent = {
  request?: { url?: string | undefined } | undefined;
  breadcrumbs?: Breadcrumb[] | undefined;
};

/**
 * Replaces the value of every sensitive query param with a marker, preserving
 * everything else about the URL — path, other params, fragment, and whether it
 * was absolute or relative. Returns the input unchanged when there is nothing
 * to redact, so the common case allocates nothing.
 */
export function scrubUrl(url: string): string {
  if (!url) return url;

  // A base makes relative URLs parseable; it is stripped again below.
  const BASE = 'https://scrub.invalid';
  try {
    const parsed = new URL(url, BASE);
    let touched = false;
    for (const key of SENSITIVE_QUERY_PARAMS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, REDACTED);
        touched = true;
      }
    }
    if (!touched) return url;

    const wasAbsolute = parsed.origin !== BASE || /^[a-z][a-z0-9+.-]*:/i.test(url);
    return wasAbsolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // Not parseable as a URL at all. Fall back to a textual swap so a
    // malformed string still cannot smuggle the token through.
    return url.replace(
      /([?&](?:token)=)[^&#\s]*/gi,
      (_match, prefix: string) => `${prefix}${REDACTED}`,
    );
  }
}

/**
 * Scrubs every place the SDK is known to put a URL. Mutates and returns the
 * event, which is the contract Sentry's beforeSend hooks expect.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (typeof event?.request?.url === 'string') {
    event.request.url = scrubUrl(event.request.url);
  }

  if (Array.isArray(event?.breadcrumbs)) {
    for (const crumb of event.breadcrumbs) {
      const data = crumb?.data;
      if (!data) continue;
      // Navigation crumbs use from/to; fetch and xhr crumbs use url.
      for (const key of ['url', 'from', 'to']) {
        if (typeof data[key] === 'string') {
          data[key] = scrubUrl(data[key] as string);
        }
      }
    }
  }

  return event;
}
