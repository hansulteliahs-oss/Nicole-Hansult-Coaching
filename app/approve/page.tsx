/**
 * /approve — read the draft, then approve it.
 *
 * The link arrives by SMS (previously email) as
 *   /approve?token=<raw token>&kind=post|newsletter
 *
 * The token is resolved server-side and the draft rendered above the button,
 * because after the move to SMS this page is the only place the draft is seen.
 * A deliberate confirm step — a real click, not a mail-client link prefetch —
 * is what actually fires the publish.
 *
 * `kind` in the URL is ignored for rendering: the DB row is authoritative, so
 * a mistyped or tampered query param cannot make the page render one thing
 * and approve another. It is still forwarded to /api/approve unchanged.
 */
import type { Metadata } from 'next';

import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { resolveApprovalToken, type ApprovalRejection } from '@/lib/content/approvals';

import { ApproveClient } from './ApproveClient';
import { DraftPreview } from './DraftPreview';

export const metadata: Metadata = {
  title: 'Approve & Publish',
  robots: { index: false },
};

// Token state changes underneath us; this page must never be cached.
export const dynamic = 'force-dynamic';

const REJECTION_COPY: Record<ApprovalRejection, { title: string; body: string }> = {
  missing: {
    title: "We can't find this draft",
    body: 'The link may be incomplete. Text Eliahs and he will send a fresh one.',
  },
  used: {
    title: 'This one is already approved',
    body: 'Nothing more to do here. It has already gone out.',
  },
  expired: {
    title: 'This link has expired',
    body: 'Approval links last 14 days. Text Eliahs and he will send a fresh one.',
  },
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="font-serif text-3xl text-ink mb-4">{title}</h1>
      <p className="text-inkSoft">{body}</p>
    </>
  );
}

export default async function ApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; kind?: string }>;
}) {
  const { token } = await searchParams;

  let content: React.ReactNode;

  if (!token) {
    content = (
      <Message
        title="This link is missing its approval token"
        body="Open the link exactly as it was sent to you, or text Eliahs for a fresh one."
      />
    );
  } else {
    const resolution = await resolveApprovalToken(token);
    if (!resolution.ok) {
      content = <Message {...REJECTION_COPY[resolution.reason]} />;
    } else {
      content = (
        <>
          <DraftPreview draft={resolution.draft} />
          <ApproveClient token={token} kind={resolution.draft.kind} />
        </>
      );
    }
  }

  return (
    <>
      <Nav />
      <main className="bg-bg">
        <section className="mx-auto max-w-2xl px-6 pt-32 md:pt-40 pb-24 text-center">
          {content}
        </section>
      </main>
      <Footer />
    </>
  );
}
