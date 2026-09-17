/**
 * GET /api/cron/reconcile-sends — flip queued sends to sent once Mailchimp
 * has actually sent them.
 *
 * A campaign scheduled in Mailchimp fires there with no callback to the site,
 * so without this sweep /queue and content_plan show a launch email as
 * "queued" forever, and the daily agent check cannot tell a send that went
 * out from one that silently did not. Runs once a day (vercel.json, 13:00
 * UTC, after every 08:00 PT send has had five hours to leave).
 *
 * This route only decides which rows to hand to mark_sent, the site RPC that
 * completes the draft, the plan slot and the sends row in one statement. It
 * never schedules, cancels or re-sends anything.
 *
 * Auth is Vercel's cron convention: Vercel sends `Authorization: Bearer
 * $CRON_SECRET` on every invocation when the env var is set. No secret means
 * no run: an open reconciler is a cheap way to hammer Mailchimp.
 */
import { NextResponse } from 'next/server';

import { getAdminClient } from '@/lib/supabase/admin';
import { getCampaign } from '@/lib/mailchimp/campaigns';

export const dynamic = 'force-dynamic';

type QueuedSend = {
  id: string;
  newsletter_draft_id: string;
  mailchimp_campaign_id: string;
  scheduled_for: string;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data, error } = await admin
    .from('scheduled_sends')
    .select('id, newsletter_draft_id, mailchimp_campaign_id, scheduled_for')
    .eq('status', 'queued')
    .lt('scheduled_for', new Date().toISOString());

  if (error) {
    console.error(`[reconcile-sends] could not read queued sends: ${error.message}`);
    return NextResponse.json({ error: 'could not read queued sends' }, { status: 502 });
  }

  const rows = (data ?? []) as QueuedSend[];
  let marked = 0;
  let pending = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const campaign = await getCampaign(row.mailchimp_campaign_id);
      if (campaign.status !== 'sent') {
        pending += 1;
        continue;
      }
      const { error: markError } = await admin.rpc('mark_sent', {
        p_draft_id: row.newsletter_draft_id,
        p_campaign_id: row.mailchimp_campaign_id,
        p_sent_at: campaign.sendTime ?? row.scheduled_for,
      });
      if (markError) {
        errors += 1;
        console.error(
          `[reconcile-sends] mark_sent failed for draft ${row.newsletter_draft_id}: ${markError.message}`,
        );
        continue;
      }
      marked += 1;
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : 'lookup failed';
      console.error(`[reconcile-sends] send ${row.id} (${row.mailchimp_campaign_id}): ${message}`);
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, marked, pending, errors });
}
