/**
 * The draft, rendered above the approve button.
 *
 * Before this existed, `/approve` showed only "Approve this post?" and a
 * button — the draft itself lived in the preview email. With the notification
 * moving to SMS there is no email, so this is the only place the draft is
 * seen. "Nothing ships unseen" is a hard rule for this pipeline.
 *
 * Posts go through LessonBody, the site's shared markdown renderer, so the
 * preview looks like the published post will.
 *
 * Newsletters are raw email HTML with their own <style> and table layout.
 * They render in a sandboxed iframe: injecting them into the page would let
 * the email's CSS fight the site's, and an iframe is closer to what the
 * subscriber actually receives. sandbox="" with no allow-* tokens means no
 * scripts, no forms, no navigation.
 */
import { LessonBody } from '@/components/vibrant40/LessonBody';
import type { ApprovalDraft } from '@/lib/content/approvals';

export function DraftPreview({ draft }: { draft: ApprovalDraft }) {
  if (draft.kind === 'post') {
    return (
      <article className="mb-10 text-left">
        <h2 className="font-serif text-2xl text-ink mb-6">{draft.title}</h2>
        <LessonBody body={draft.body_md} />
      </article>
    );
  }

  return (
    <article className="mb-10 text-left">
      <h2 className="font-serif text-2xl text-ink mb-2">{draft.subject}</h2>
      {draft.preview_text && (
        <p className="text-sm text-inkSoft mb-6">
          Preview text: {draft.preview_text}
        </p>
      )}
      <iframe
        title="Newsletter preview"
        srcDoc={draft.body_html}
        sandbox=""
        className="w-full h-[70vh] rounded-2xl border border-inkFaint bg-white"
      />
    </article>
  );
}
