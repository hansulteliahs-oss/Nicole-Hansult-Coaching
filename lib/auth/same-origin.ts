/**
 * Validates that a `?next=` redirect target is a same-origin path.
 * Rejects absolute URLs (https://...) and protocol-relative URLs (//).
 * Falls back to /account for any invalid input.
 *
 * Used by /login, /signup, and password-reset flows to prevent
 * open-redirect attacks via the ?next= query param.
 */
export function validateSameOriginNext(
  next: string | undefined | null,
): string {
  if (!next) return '/account';
  if (!next.startsWith('/')) return '/account'; // absolute URL (http://, https://, etc.)
  if (next.startsWith('//')) return '/account'; // protocol-relative (//evil.com)
  return next;
}
