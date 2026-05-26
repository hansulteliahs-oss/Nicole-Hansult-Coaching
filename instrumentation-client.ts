/**
 * Phase 5 Plan 01 Task 3 — Sentry client-runtime config.
 *
 * Next.js 16 picks up instrumentation-client.ts automatically and runs it
 * before any client-side React tree mounts. Same production-only enable
 * flag as the server/edge configs.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
