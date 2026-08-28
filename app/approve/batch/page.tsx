/**
 * /approve/batch — read every launch email, then approve them all at once.
 *
 * Decision 7. Nicole reads N emails in one sitting and presses once; the
 * campaigns are created and scheduled in Mailchimp, so the sends no longer
 * depend on her being reachable on the day.
 *
 * "Nothing ships unseen" is unchanged: every body is rendered here, in the
 * same sandboxed iframe /approve uses — and that now includes who each email
 * goes to, not just what it says.
 *
 * A used token is not treated as "nothing to do here": approve_batch claims
 * the token on the first press but the route can fail partway through
 * Mailchimp, so a refresh has to be able to say "3 of 5 still need
 * scheduling" instead of a blanket "already approved" that may be false.
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

// The only two ids the spec names. "Sugar Cravings" exists as BOTH a list and
// a static segment on the main list — different audiences, same name — so a
// raw id is shown whenever it isn't one of these two.
const KNOWN_LISTS: Record<string, string> = {
  f531604a9a: 'Main list',
  ecacfdabed: 'Sugar Cravings list',
};

function formatAudience(listId: string, segmentId: string | null): string {
  const listLabel = KNOWN_LISTS[listId] ?? listId;
  return segmentId ? `${listLabel} · segment ${segmentId}` : listLabel;
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

  const pending = resolution.ok
    ? resolution.drafts.filter((d) => !d.mailchimp_campaign_id)
    : [];
  const allScheduled = resolution.ok && resolution.alreadyUsed && pending.length === 0;

  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-2xl px-6 pt-32 md:pt-40 pb-24">
          {!resolution.ok ? (
            <div className="text-center">
              <h1 className="font-serif text-3xl text-ink mb-4">We can&apos;t open this batch</h1>
              <p className="text-inkSoft">
                {resolution.reason === 'expired'
                  ? 'This link has expired. '
                  : ''}
                Text Eliahs and he will send a fresh link.
              </p>
            </div>
          ) : allScheduled ? (
            <div className="text-center">
              <h1 className="font-serif text-3xl text-ink mb-4">These are already scheduled</h1>
              <p className="text-inkSoft">
                All {resolution.drafts.length} emails are queued in Mailchimp. Nothing more to
                do here.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl text-ink mb-2 text-center">
                {resolution.drafts.length} launch emails
              </h1>
              <p className="text-inkSoft mb-10 text-center">
                {resolution.alreadyUsed
                  ? `${pending.length} of ${resolution.drafts.length} still need scheduling. Read them below, then press once to finish the rest.`
                  : 'Read them all. One press schedules every one of them.'}
              </p>

              {resolution.drafts.map((draft, i) => (
                <article key={draft.id} className="mb-12 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-grayDeep mb-1">
                    {i + 1} of {resolution.drafts.length} · {formatWhen(draft.scheduled_for)} PT ·{' '}
                    {formatAudience(draft.list_id, draft.segment_id)}
                    {draft.mailchimp_campaign_id ? ' · Already scheduled' : ''}
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

              <BatchClient
                token={token!}
                total={resolution.drafts.length}
                pending={pending.length}
              />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
