/**
 * POST /api/approve — the site does the irreversible thing.
 *
 * This used to forward to N8N_RESUME_WEBHOOK_URL and let a 62-node workflow
 * decide what happened next. It now calls the site RPCs directly. Decision 3:
 * the agent proposes, the site acts.
 *
 * `kind` from the client is IGNORED. The approval_tokens row is authoritative,
 * exactly as app/approve/page.tsx already treats it, so a tampered query param
 * cannot make the page render one thing and this route do another.
 *
 * The newsletter path is the reason release_for_retry exists: if Mailchimp
 * throws anywhere between the claim and the send, the draft goes back to
 * 'approved' and the same link works again. Under n8n the token was already
 * burnt at that point and the draft was stranded forever — three of them still
 * are.
 *
 * The catch around createCampaign/setCampaignContent/sendCampaign is split in
 * two, not one. createCampaign and setCampaignContent failing means NOTHING
 * was sent — releasing is correct. sendCampaign failing is AMBIGUOUS: a non-2xx
 * means Mailchimp rejected it, but a timeout or network error can mean
 * Mailchimp accepted and sent while the response was lost. Releasing there
 * would hand back a live link whose next tap sends to the whole list a second
 * time, so that branch holds the draft in 'sending' and records the ambiguity
 * instead of un-claiming anything.
 */
import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  createCampaign,
  setCampaignContent,
  sendCampaign,
} from '@/lib/mailchimp/campaigns';

type PublishRow = { slug: string; already: boolean };
type ClaimRow = {
  draft_id: string;
  subject: string;
  body_html: string;
  list_id: string;
  segment_id: string | null;
  already: boolean;
};

async function publishPost(admin: SupabaseClient, token: string) {
  const { data, error } = await admin.rpc('approve_and_publish', { p_token: token });
  if (error) {
    console.error(`[approve] approve_and_publish: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const row = (data as PublishRow[] | null)?.[0];
  if (!row?.slug) {
    return NextResponse.json({ error: 'publish returned nothing' }, { status: 502 });
  }

  // In-process, so publishing no longer depends on a second HTTP hop to
  // /api/revalidate with a shared secret. 'max' matches app/api/revalidate.
  revalidateTag('blog', 'max');
  revalidateTag(`blog:${row.slug}`, 'max');
  revalidatePath(`/insights/${row.slug}`);
  revalidatePath('/insights');

  return NextResponse.json({ ok: true, already: row.already, slug: row.slug });
}

async function sendNewsletter(admin: SupabaseClient, token: string) {
  const { data, error } = await admin.rpc('claim_for_send', { p_token: token });
  if (error) {
    console.error(`[approve] claim_for_send: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const claim = (data as ClaimRow[] | null)?.[0];
  if (!claim) {
    return NextResponse.json({ error: 'claim returned nothing' }, { status: 502 });
  }
  if (claim.already) {
    return NextResponse.json({ ok: true, already: true });
  }

  // claim_for_send deliberately does not carry preview_text — its contract is
  // "everything needed to send". The preview line is part of what Nicole
  // approved though, so read it here rather than dropping it.
  const { data: extra } = await admin
    .from('newsletter_drafts')
    .select('preview_text')
    .eq('id', claim.draft_id)
    .maybeSingle();

  let campaignId: string | undefined;
  let sendAttempted = false;
  try {
    campaignId = await createCampaign({
      listId: claim.list_id,
      segmentId: claim.segment_id,
      subject: claim.subject,
      previewText: (extra as { preview_text: string | null } | null)?.preview_text ?? null,
      title: `Newsletter ${claim.draft_id}`,
    });
    await setCampaignContent(campaignId, claim.body_html);

    // Set immediately before the send await, never after — moving this below
    // sendCampaign would make a throw from sendCampaign take the pre-send
    // branch below and reintroduce the double-send bug this split exists to
    // close.
    sendAttempted = true;
    await sendCampaign(campaignId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mailchimp failed';

    if (!sendAttempted) {
      // Nothing went out — creation or content failed. Releasing is correct:
      // the draft returns to 'approved' and the same link works again.
      const { error: releaseError } = await admin.rpc('release_for_retry', {
        p_draft_id: claim.draft_id,
        p_error: message,
      });
      if (releaseError) {
        // supabase-js resolves with { error } here rather than throwing — an
        // unchecked failure would leave the draft stuck in 'sending' and the
        // token still claimed, so the link would be dead with nothing said.
        console.error(
          `[approve] send failed before dispatch AND release_for_retry itself failed: ${releaseError.message} (original: ${message})`,
        );
        return NextResponse.json(
          {
            error:
              'the send failed and releasing the draft also failed — the link may not work yet, text Eliahs',
          },
          { status: 502 },
        );
      }
      console.error(`[approve] send failed before dispatch, draft released: ${message}`);
      return NextResponse.json(
        { error: 'the send failed and the draft was released — open the link and try again' },
        { status: 502 },
      );
    }

    // The send call itself failed and its outcome is UNKNOWN. Do not release:
    // a timeout can mean Mailchimp accepted and sent while the response was
    // lost, and releasing would hand back a live link whose next tap sends to
    // the whole list a second time. Hold the draft in 'sending' and record it
    // directly — release_for_retry's forensics insert must NOT fire on this
    // path, but the one genuinely dangerous outcome still has to show up in
    // /queue.
    const { error: insertError } = await admin.from('pipeline_runs').insert({
      kind: 'send',
      status: 'failed',
      finished_at: new Date().toISOString(),
      produced_draft_id: claim.draft_id,
      error: message,
      notes: { send_outcome: 'unknown', held: true },
    });
    if (insertError) {
      // Log only — do not change the response. The 502 below is already
      // correct and the draft is already held; a failed forensics write must
      // not make the answer worse.
      console.error(
        `[approve] could not record the held send for draft ${claim.draft_id}: ${insertError.message}`,
      );
    }
    console.error(`[approve] send outcome UNKNOWN, draft held in sending: ${message}`);
    return NextResponse.json(
      {
        error:
          'the send may or may not have gone out — check the campaign in Mailchimp before retrying. The draft is held and will not send again on its own.',
      },
      { status: 502 },
    );
  }

  const { error: markError } = await admin.rpc('mark_sent', {
    p_draft_id: claim.draft_id,
    p_campaign_id: campaignId,
    p_sent_at: new Date().toISOString(),
  });
  if (markError) {
    // The send DID happen — Mailchimp already has it. Telling the operator it
    // failed would be a lie that invites a duplicate send; the truth here is
    // "sent, but the database doesn't know it yet."
    console.error(
      `[approve] send succeeded but mark_sent failed, draft stuck in 'sending': ${markError.message}`,
    );
    return NextResponse.json({
      ok: true,
      already: false,
      campaignId,
      warning: 'sent, but recording it failed — /queue may not reflect this yet',
    });
  }

  return NextResponse.json({ ok: true, already: false, campaignId });
}

export async function POST(req: Request) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const token = body.token;
  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: tokenRow, error } = await admin
    .from('approval_tokens')
    .select('draft_kind, batch_id')
    .eq('token_hash', token)
    .maybeSingle();

  if (error) {
    console.error(`[approve] token lookup failed: ${error.message}`);
    return NextResponse.json({ error: 'could not read the token' }, { status: 502 });
  }
  if (!tokenRow) {
    return NextResponse.json({ error: 'unknown token' }, { status: 404 });
  }
  if (tokenRow.batch_id) {
    return NextResponse.json(
      { error: 'this link approves a batch — open /approve/batch' },
      { status: 400 },
    );
  }

  if (tokenRow.draft_kind === 'post') return publishPost(admin, token);
  if (tokenRow.draft_kind === 'newsletter') return sendNewsletter(admin, token);

  return NextResponse.json({ error: 'unknown draft kind' }, { status: 400 });
}
