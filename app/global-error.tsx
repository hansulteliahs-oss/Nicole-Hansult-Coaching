'use client';

/**
 * Phase 5 Plan 01 Task 3 — Sentry global error boundary.
 *
 * Required by @sentry/nextjs to capture errors thrown in the root layout.
 * Renders a minimal fallback (own <html> + <body>) because the layout has
 * already failed.
 */
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h1>Something went wrong</h1>
        <p>We&apos;ve been notified. Please refresh or come back in a few minutes.</p>
      </body>
    </html>
  );
}
