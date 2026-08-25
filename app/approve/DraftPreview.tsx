/**
 * The draft, rendered above the approve button.
 *
 * Before this existed, `/approve` showed only "Approve this post?" and a
 * button — the draft itself lived in the preview email. With the notification
 * moving to SMS there is no email, so this is the only place the draft is
 * seen. "Nothing ships unseen" is a hard rule for this pipeline.
 *
 * Posts go through LessonBody, the site's shared markdown renderer, so the
 * preview looks like the published post will. Above it sits the metadata
 * block: the URL, the search title, the search description, the category and
 * the share image are all LLM-written and all publish under Nicole's name, so
 * showing only the body would still be shipping most of the post unseen.
 * Every one of them is nullable, so the block says so out loud when one is
 * missing rather than quietly omitting the row.
 *
 * Newsletters are raw email HTML with their own <style> and table layout.
 * They render in a sandboxed iframe: injecting them into the page would let
 * the email's CSS fight the site's, and an iframe is closer to what the
 * subscriber actually receives. sandbox="" with no allow-* tokens means no
 * scripts, no forms, no navigation.
 */
import { Chip } from '@/components/ui/Chip';
import { LessonBody } from '@/components/vibrant40/LessonBody';
import type { ApprovalDraft } from '@/lib/content/approvals';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicole-hansult-coaching.vercel.app';

/**
 * Mirrors app/insights/[slug]/page.tsx:83, which falls back to this label when
 * `category` is null. Kept in sync by hand — the preview must show what will
 * actually publish, not what is in the column.
 */
const DEFAULT_CATEGORY = 'Functional Longevity';

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-grayDeep">
        {label}
      </dt>
      <dd className="text-sm text-ink break-words">{children}</dd>
    </div>
  );
}

function NotSet({ consequence }: { consequence: string }) {
  return <span className="text-amber-700">Not set. {consequence}</span>;
}

function PostMetadata({
  draft,
}: {
  draft: Extract<ApprovalDraft, { kind: 'post' }>;
}) {
  return (
    <dl className="mb-8 divide-y divide-inkFaint rounded-2xl border border-inkFaint bg-cardSoft px-5 py-1">
      <Row label="Public URL">
        <code className="text-xs">{`${BASE_URL}/insights/${draft.slug}`}</code>
      </Row>

      <Row label="Search title">
        {draft.seo_title ?? (
          <>
            {draft.title}{' '}
            <span className="text-grayDeep">(falls back to the post title)</span>
          </>
        )}
      </Row>

      <Row label="Search description">
        {draft.meta_description ?? (
          <NotSet consequence="Google will pick its own snippet." />
        )}
      </Row>

      <Row label="Category">
        <Chip tint="sky">{draft.category ?? DEFAULT_CATEGORY}</Chip>
        {draft.category ? null : (
          <span className="ml-2 text-grayDeep">(default)</span>
        )}
      </Row>

      <Row label="Share image">
        {draft.hero_image_url ? (
          // An arbitrary LLM-supplied URL, not a known-domain asset that
          // next/image is configured to optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.hero_image_url}
            alt="Share preview"
            className="max-h-40 rounded-xl border border-inkFaint"
          />
        ) : (
          <NotSet consequence="Links shared to social will have no picture." />
        )}
      </Row>
    </dl>
  );
}

export function DraftPreview({ draft }: { draft: ApprovalDraft }) {
  if (draft.kind === 'post') {
    return (
      <article className="mb-10 text-left">
        <h2 className="font-serif text-2xl text-ink mb-6">{draft.title}</h2>
        <PostMetadata draft={draft} />
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
