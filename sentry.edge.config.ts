/**
 * Phase 5 Plan 01 Task 3 — Sentry edge-runtime config.
 *
 * Wired via instrumentation.ts when NEXT_RUNTIME === 'edge'. Same
 * production-only enable flag as the Node config.
 *
 * `beforeSend` / `beforeSendTransaction` strip the approval token out of
 * /approve URLs before anything leaves the process. See
 * lib/observability/scrub.ts.
 */
import * as Sentry from '@sentry/nextjs';

import { scrubEvent } from '@/lib/observability/scrub';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,
});
