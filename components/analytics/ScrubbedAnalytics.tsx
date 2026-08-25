'use client';

/**
 * Vercel Analytics and Speed Insights, with approval tokens stripped from the
 * reported URL.
 *
 * Both send the page URL by default, and on /approve that URL carries a raw
 * approval token — a bearer credential for an irreversible send. Vercel
 * documents `beforeSend` precisely for redacting sensitive query params, which
 * confirms query strings reach them otherwise.
 *
 * This exists as a client component because `beforeSend` is a function, and
 * functions cannot be passed from a server component (app/layout.tsx) to a
 * client one.
 */
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { scrubUrl } from '@/lib/observability/scrub';

export function ScrubbedAnalytics() {
  return (
    <>
      <Analytics beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
      <SpeedInsights beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
    </>
  );
}
