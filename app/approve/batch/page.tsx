/**
 * /approve/batch — read every launch email, then approve them all at once.
 *
 * Decision 7. Nicole reads N emails in one sitting and presses once; the
 * campaigns are created and scheduled in Mailchimp, so the sends no longer
 * depend on her being reachable on the day.
 *
 * "Nothing ships unseen" is unchanged: every body is rendered here, in the
 * same sandboxed iframe /approve uses.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { resolveBatchToken } from '@/lib/content/batch';

import { BatchClient } from './BatchClient';

export const metadata: Metadata = {
  title: 'Approve launch emails',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

function formatWhen(iso: string | null): string {
  if (!iso) return 'No send time set';
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
  });
}

export default async function ApproveBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const resolution = token
    ? await resolveBatchToken(token)
    : ({ ok: false, reason: 'missing' } as const);

  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-2xl px-6 pt-32 md:pt-40 pb-24">
          {!resolution.ok ? (
            <div className="text-center">
              <h1 className="font-serif text-3xl text-ink mb-4">
                {resolution.reason === 'used'
                  ? 'These are already approved'
                  : "We can't open this batch"}
              </h1>
              <p className="text-inkSoft">
                {resolution.reason === 'used'
                  ? 'Nothing more to do here. The emails are scheduled.'
                  : 'Text Eliahs and he will send a fresh link.'}
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl text-ink mb-2 text-center">
                {resolution.drafts.length} launch emails
              </h1>
              <p className="text-inkSoft mb-10 text-center">
                Read them all. One press schedules every one of them.
              </p>

              {resolution.drafts.map((draft, i) => (
                <article key={draft.id} className="mb-12 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-grayDeep mb-1">
                    {i + 1} of {resolution.drafts.length} · {formatWhen(draft.scheduled_for)} PT
                  </p>
                  <h2 className="font-serif text-2xl text-ink mb-2">{draft.subject}</h2>
                  {draft.preview_text && (
                    <p className="text-sm text-inkSoft mb-4">
                      Preview text: {draft.preview_text}
                    </p>
                  )}
                  <iframe
                    title={`Launch email ${i + 1}`}
                    srcDoc={draft.body_html}
                    sandbox=""
                    className="w-full h-[60vh] rounded-2xl border border-inkFaint bg-white"
                  />
                </article>
              ))}

              <BatchClient token={token!} count={resolution.drafts.length} />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
