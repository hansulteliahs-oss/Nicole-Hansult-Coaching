/**
 * Phase 5 Plan 01 Task 3 — Sentry runtime registration.
 *
 * Auto-detected by Next.js at the project root. `register()` runs once per
 * server boot per runtime; we conditionally import the matching config so
 * Node and Edge each get their own Sentry init.
 *
 * `onRequestError` is re-exported per Sentry's Next.js 15+ contract — it
 * captures errors thrown inside Server Component renders.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';
