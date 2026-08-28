/**
 * POST /api/approve/batch — approve N drafts and park N campaigns in Mailchimp.
 *
 * Retry-safe by construction. approve_batch claims the token once but always
 * returns the full batch, and this route skips any draft that already carries
 * a mailchimp_campaign_id. So a partial failure — three created, then a 504 —
 * is fixed by pressing the button again, not by a rescue.
 *
 * scheduled_sends rows are written with the service-role client rather than
 * through an RPC: recording what was just scheduled is bookkeeping, not an
 * irreversible act, and the site already writes tables this way (lib/actions/idea.ts).
 */
import { NextResponse } from 'next/server';

import { getAdminClient } from '@/lib/supabase/admin';
import {
  createCampaign,
  setCampaignContent,
  scheduleCampaign,
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

  const { data, error } = await admin.rpc('approve_batch', { p_token: body.token });
  if (error) {
    console.error(`[approve/batch] approve_batch: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const drafts = (data as Draft[] | null) ?? [];
  if (drafts.length === 0) {
    return NextResponse.json({ error: 'the batch is empty' }, { status: 404 });
  }

  const undated = drafts.filter((d) => !d.mailchimp_campaign_id && !d.scheduled_for);
  if (undated.length > 0) {
    return NextResponse.json(
      {
        error: `these have no send time: ${undated.map((d) => d.subject).join(', ')}`,
      },
      { status: 422 },
    );
  }

  let scheduled = 0;
  let skipped = 0;

  for (const draft of drafts) {
    if (draft.mailchimp_campaign_id) {
      skipped += 1;
      continue;
    }
    try {
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

      const { error: sendRowError } = await admin.from('scheduled_sends').insert({
        newsletter_draft_id: draft.id,
        mailchimp_campaign_id: campaignId,
        list_id: draft.list_id,
        segment_id: draft.segment_id,
        scheduled_for: draft.scheduled_for,
      });

      // Less severe than the persist above: the campaign is already
      // scheduled and will fire regardless, so this failure mode is a send
      // /queue doesn't know about — exactly the drift decision 8's daily
      // agent check exists to catch. The message says so, because an
      // operator seeing this 502 needs to know the send is still armed.
      if (sendRowError) {
        throw new Error(
          `campaign ${campaignId} for "${draft.subject}" is scheduled but was not recorded: ${sendRowError.message}`,
        );
      }

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

  return NextResponse.json({ ok: true, scheduled, skipped });
}
