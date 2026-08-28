import type { Metadata } from 'next';

import { QueueClient } from './QueueClient';

export const metadata: Metadata = {
  title: 'Pipeline queue',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * /queue — Eliahs's forensics surface. Unlisted, noindex, passcode-gated
 * inside <QueueClient> exactly like /idea.
 *
 * Two things live here: every pipeline run ever (pipeline_runs) and every
 * campaign parked in Mailchimp (scheduled_sends), with the only cancel button
 * in the system.
 */
export default function QueuePage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-ink">Pipeline queue</h1>
        <p className="mb-6 text-sm text-grayDeep">
          Every run, and every campaign waiting in Mailchimp.
        </p>
        <QueueClient />
      </div>
    </main>
  );
}
