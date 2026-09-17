/**
 * POST /api/approve/batch — approve N drafts and park N campaigns in Mailchimp.
 *
 * Retry-safe by construction. approve_batch claims the token once but always
 * returns the full batch. On a retry this route skips only a draft that has a
 * scheduled_sends row, because that row is the one thing written AFTER the
 * campaign is fully parked. A draft with a campaign id but no sends row is a
 * campaign that was created and then lost content or schedule to a failure
 * (the id is persisted first on purpose, see below), so it is RESUMED from
 * Mailchimp's own view of the campaign: still in `save` means content and
 * schedule it; already `schedule` means just record it; already `sent` means
 * record it as sent. The old rule skipped any draft with an id, which left
 * exactly those half-done campaigns stranded forever.
 *
 * A body that links to an /insights/ post which is not yet published is
 * refused before the claim, for the same reason the undated check is: the
 * token must not be spent on a batch that cannot go out as written.
 *
 * The undated-draft check runs BEFORE approve_batch, not after. approve_batch
 * claims the token and flips every draft to 'approved' in the same statement,
 * so validating on its return value would mean one missing send time burns
 * the token and schedules nothing — with no way back, since the page only
 * treats an unclaimed token as retryable. Reading the batch first, the same
 * way lib/content/batch.ts does, lets a bad batch fail closed before
 * anything is claimed.
 *
 * scheduled_sends rows are written with the service-role client rather than
 * through an RPC: recording what was just scheduled is bookkeeping, not an
 * irreversible act, and the site already writes tables this way (lib/actions/idea.ts).
 */
import { NextResponse } from 'next/server';

import { getAdminClient } from '@/lib/supabase/admin';
import { unpublishedInsightsSlugs } from '@/lib/content/links';
import {
  createCampaign,
  setCampaignContent,
  scheduleCampaign,
  getCampaign,
} from '@/lib/mailchimp/campaigns';

type Draft = {
  id: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  list_id: string;
  segment_id: string | null;
  scheduled_for: string | null;
  mailchimp_campaign_id: string | null;
};

export async function POST(req: Request) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Read BEFORE claiming. Same lookup as resolveBatchToken: the token row for
  // its batch_id, then the drafts by batch_id. Neither is authorisation —
  // approve_batch still does that — this is only "is scheduling this batch
  // even possible" answered before the token can be spent on the answer "no".
  const { data: tokenRow, error: tokenError } = await admin
    .from('approval_tokens')
    .select('batch_id')
    .eq('token_hash', body.token)
    .maybeSingle();

  if (tokenError) {
    console.error(`[approve/batch] token lookup failed: ${tokenError.message}`);
    return NextResponse.json({ error: 'could not read the token' }, { status: 502 });
  }
  if (!tokenRow?.batch_id) {
    return NextResponse.json({ error: 'unknown or invalid batch token' }, { status: 404 });
  }

  const { data: preDrafts, error: preDraftsError } = await admin
    .from('newsletter_drafts')
    .select('id, subject, body_html, scheduled_for, mailchimp_campaign_id')
    .eq('batch_id', tokenRow.batch_id);

  if (preDraftsError) {
    console.error(`[approve/batch] pre-claim draft read failed: ${preDraftsError.message}`);
    return NextResponse.json({ error: 'could not read the batch' }, { status: 502 });
  }

  // Which drafts are already fully parked. Read once, used by the pre-claim
  // checks and by the loop below.
  const preIds = (preDrafts ?? []).map((d) => d.id as string).filter(Boolean);
  const { data: sendRows, error: sendRowsError } = await admin
    .from('scheduled_sends')
    .select('newsletter_draft_id')
    .in('newsletter_draft_id', preIds);

  if (sendRowsError) {
    console.error(`[approve/batch] scheduled_sends read failed: ${sendRowsError.message}`);
    return NextResponse.json({ error: 'could not read scheduled sends' }, { status: 502 });
  }
  const parked = new Set(
    ((sendRows ?? []) as { newsletter_draft_id: string }[]).map((r) => r.newsletter_draft_id),
  );

  const notParked = (preDrafts ?? []).filter((d) => !parked.has(d.id as string));

  // Links to unpublished posts, checked before the claim so the fix (approve
  // the post) leaves this link working.
  let missing: string[];
  try {
    missing = await unpublishedInsightsSlugs(
      admin,
      notParked.map((d) => (d.body_html as string) ?? ''),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'link check failed';
    console.error(`[approve/batch] ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `this batch links to a post that is not published yet: ${missing.join(', ')}. Approve the post first, then open this link again.`,
      },
      { status: 422 },
    );
  }

  const preUndated = notParked.filter((d) => !d.scheduled_for);
  if (preUndated.length > 0) {
    return NextResponse.json(
      {
        error: `these have no send time: ${preUndated.map((d) => d.subject).join(', ')}`,
      },
      { status: 422 },
    );
  }

  const { data, error } = await admin.rpc('approve_batch', { p_token: body.token });
  if (error) {
    console.error(`[approve/batch] approve_batch: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const drafts = (data as Draft[] | null) ?? [];
  if (drafts.length === 0) {
    return NextResponse.json({ error: 'the batch is empty' }, { status: 404 });
  }

  let scheduled = 0;
  let skipped = 0;
  let resumed = 0;

  const recordSend = async (draft: Draft, campaignId: string, status?: 'sent') => {
    const { error: sendRowError } = await admin.from('scheduled_sends').insert({
      newsletter_draft_id: draft.id,
      mailchimp_campaign_id: campaignId,
      list_id: draft.list_id,
      segment_id: draft.segment_id,
      scheduled_for: draft.scheduled_for,
      ...(status ? { status } : {}),
    });
    // Less severe than the persist below: the campaign is already scheduled
    // and will fire regardless, so this failure mode is a send /queue doesn't
    // know about — exactly the drift decision 8's daily agent check exists
    // to catch. The message says so, because an operator seeing this 502
    // needs to know the send is still armed.
    if (sendRowError) {
      throw new Error(
        `campaign ${campaignId} for "${draft.subject}" is scheduled but was not recorded: ${sendRowError.message}`,
      );
    }
  };

  for (const draft of drafts) {
    if (parked.has(draft.id)) {
      skipped += 1;
      continue;
    }
    try {
      if (draft.mailchimp_campaign_id) {
        // Created on an earlier press, then lost somewhere before the sends
        // row. Ask Mailchimp where it got to and finish from there. Never a
        // second createCampaign: that is the duplicate-send bug.
        const campaignId = draft.mailchimp_campaign_id;
        const campaign = await getCampaign(campaignId);
        if (campaign.status === 'sent' || campaign.status === 'sending') {
          await recordSend(draft, campaignId, 'sent');
          const { error: markError } = await admin.rpc('mark_sent', {
            p_draft_id: draft.id,
            p_campaign_id: campaignId,
            p_sent_at: campaign.sendTime ?? draft.scheduled_for,
          });
          if (markError) {
            console.error(`[approve/batch] mark_sent for "${draft.subject}": ${markError.message}`);
          }
        } else if (campaign.status === 'schedule') {
          await recordSend(draft, campaignId);
        } else if (campaign.status === 'save' || campaign.status === 'paused') {
          await setCampaignContent(campaignId, draft.body_html);
          await scheduleCampaign(campaignId, new Date(draft.scheduled_for!));
          await recordSend(draft, campaignId);
        } else {
          throw new Error(
            `campaign ${campaignId} is in state "${campaign.status}", which this route does not know how to resume. Check it in Mailchimp.`,
          );
        }
        resumed += 1;
        continue;
      }

      const campaignId = await createCampaign({
        listId: draft.list_id,
        segmentId: draft.segment_id,
        subject: draft.subject,
        previewText: draft.preview_text,
        title: `Launch ${draft.subject}`,
      });

      // Persist the id BEFORE anything else can fail. A campaign that exists
      // and is scheduled in Mailchimp but is unknown to the database is the
      // one state a retry turns into a duplicate send to the whole list.
      const { error: persistError } = await admin
        .from('newsletter_drafts')
        .update({ mailchimp_campaign_id: campaignId })
        .eq('id', draft.id);

      // supabase-js RESOLVES with { error } on a failed write — it does not
      // throw. Unchecked, a failed persist would fall through and schedule a
      // campaign the database has no record of, which a retry turns into a
      // duplicate send.
      if (persistError) {
        throw new Error(
          `failed to record campaign ${campaignId} for "${draft.subject}": ${persistError.message}`,
        );
      }

      await setCampaignContent(campaignId, draft.body_html);
      await scheduleCampaign(campaignId, new Date(draft.scheduled_for!));
      await recordSend(draft, campaignId);

      scheduled += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mailchimp failed';
      console.error(`[approve/batch] "${draft.subject}": ${message}`);
      return NextResponse.json(
        {
          error: `scheduled ${scheduled} of ${drafts.length}, then "${draft.subject}" failed: ${message}. Press again to finish the rest.`,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true, scheduled, skipped, resumed });
}
