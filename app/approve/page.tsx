/**
 * /approve — one-tap approval confirm page.
 *
 * Nicole's preview email links here (?token=...&kind=post|newsletter). A
 * deliberate confirm step (a real click, not a mail-client link prefetch)
 * is what actually fires the publish — so nothing goes out unseen. The button
 * POSTs the token to /api/approve, which resumes the waiting n8n workflow.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

import { ApproveClient } from './ApproveClient';

export const metadata: Metadata = {
  title: 'Approve & Publish',
  robots: { index: false },
};

export default async function ApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; kind?: string }>;
}) {
  const { token, kind } = await searchParams;
  const draftKind = kind === 'newsletter' ? 'newsletter' : 'post';

  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-2xl px-6 pt-32 md:pt-40 pb-24 text-center">
          {token ? (
            <ApproveClient token={token} kind={draftKind} />
          ) : (
            <>
              <h1 className="font-serif text-3xl text-ink mb-4">
                This link is missing its approval token
              </h1>
              <p className="text-inkSoft">
                Please tap the button straight from the preview email.
              </p>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
