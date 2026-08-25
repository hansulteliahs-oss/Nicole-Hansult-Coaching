/**
 * Press gate for the approve button.
 *
 * Split out of ApproveClient so it can be tested: vitest runs in a node
 * environment with no jsdom, so a click cannot be simulated.
 *
 * A post publishes on one press. A newsletter needs two, because the send is
 * irreversible and there is no other interlock in the system: the
 * `Live Send? (ARM)` IF node the README describes is not in the n8n workflow
 * (verified 2026-08-24), so the approve tap goes straight to a full-list send.
 */
export type ApproveState = 'idle' | 'confirming' | 'working' | 'done' | 'error';

/**
 * Approximate Mailchimp audience size, shown so the reader knows the scale of
 * what one press does. Deliberately not fetched live: this page must not
 * depend on Mailchimp being reachable. Update it when the list grows
 * materially.
 */
export const NEWSLETTER_AUDIENCE_APPROX = 1110;

export function nextOnPress(
  state: ApproveState,
  kind: 'post' | 'newsletter',
): { state: ApproveState; submit: boolean } {
  if (state === 'working' || state === 'done') {
    return { state, submit: false };
  }
  if (state === 'idle' && kind === 'newsletter') {
    return { state: 'confirming', submit: false };
  }
  // idle+post, confirming+newsletter, and any retry after an error.
  return { state: 'working', submit: true };
}

export function pressLabel(
  state: ApproveState,
  kind: 'post' | 'newsletter',
): string {
  if (state === 'working') {
    return kind === 'newsletter' ? 'Sending…' : 'Publishing…';
  }
  if (state === 'confirming') {
    return `Yes, send it to ~${NEWSLETTER_AUDIENCE_APPROX.toLocaleString('en-US')} people`;
  }
  if (state === 'error') {
    return 'Try again';
  }
  return kind === 'newsletter' ? 'Review & send newsletter' : 'Approve & publish post';
}
