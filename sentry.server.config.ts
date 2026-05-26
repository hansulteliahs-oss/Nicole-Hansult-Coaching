/**
 * Phase 5 Plan 01 Task 3 — Sentry server-runtime config (Node).
 *
 * Wired via instrumentation.ts which dynamic-imports this file when
 * NEXT_RUNTIME === 'nodejs'. Production-only by design — dev console
 * stays clean.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
