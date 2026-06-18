/**
 * POST /api/revalidate — called by n8n on publish to refresh the blog cache.
 *
 * Auth: shared secret in the `x-revalidate-secret` header (or JSON body
 * `secret`) must match REVALIDATE_SECRET. Revalidates the 'blog' tag (the
 * /insights index + all post reads) and, when a slug is supplied, the
 * per-slug tag + path so the new post is live within seconds — no redeploy.
 */
import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  let body: { secret?: string; slug?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty / non-JSON body is fine — header auth still applies
  }

  const provided = req.headers.get('x-revalidate-secret') ?? body.secret;
  if (provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 'max' = treat as fresh until the next explicit revalidation (we invalidate
  // manually on publish, so there's no time-based expiry to race).
  revalidateTag('blog', 'max');
  if (body.slug) {
    revalidateTag(`blog:${body.slug}`, 'max');
    revalidatePath(`/insights/${body.slug}`);
  }
  revalidatePath('/insights');

  return NextResponse.json({ revalidated: true, slug: body.slug ?? null });
}
