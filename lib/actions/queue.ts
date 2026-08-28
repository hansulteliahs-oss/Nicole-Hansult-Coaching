'use server';

/**
 * /queue — the run log and the scheduled sends.
 *
 * pipeline_runs is the single thing n8n Cloud could not do: it retains only
 * the last few executions, so both August deadlocks needed a full diagnostic
 * session to reconstruct. "What happened last Monday" is answerable here
 * months later.
 *
 * Decision 8: the daily agent DETECTS a stale scheduled send and pushes
 * Eliahs. It cannot unschedule. Cancelling is a human pressing the button
 * below, which is the only place in the system that can.
 */
import { headers } from 'next/headers';

import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase/admin';
import { unscheduleCampaign } from '@/lib/mailchimp/campaigns';

export type RunRow = {
  id: string;
  kind: string;
  status: string;
  attempt: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
};

export type SendRow = {
  id: string;
  mailchimp_campaign_id: string;
  list_id: string;
  segment_id: string | null;
  scheduled_for: string;
  status: string;
  cancelled_reason: string | null;
};

type Denial = 'bad_key' | 'rate_limited' | 'server';

export type QueueResult =
  | { ok: true; runs: RunRow[]; sends: SendRow[] }
  | { ok: false; error: Denial };

export type CancelResult = { ok: true } | { ok: false; error: Denial | 'mailchimp' };

/** Rate limit first, then passcode, so guesses get throttled (mirrors bankIdeaAction). */
async function gate(key: string): Promise<Denial | null> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

  if (!checkRateLimit(`queue:${ip}`, { maxTries: 10, windowMs: 60_000 })) {
    return 'rate_limited';
  }
  if (!process.env.QUEUE_KEY || key !== process.env.QUEUE_KEY) return 'bad_key';
  return null;
}

export async function loadQueueAction(key: string): Promise<QueueResult> {
  const denied = await gate(key);
  if (denied) return { ok: false, error: denied };

  const admin = getAdminClient();

  const runs = await admin
    .from('pipeline_runs')
    .select('id, kind, status, attempt, started_at, finished_at, error')
    .order('started_at', { ascending: false })
    .limit(50);

  const sends = await admin
    .from('scheduled_sends')
    .select('id, mailchimp_campaign_id, list_id, segment_id, scheduled_for, status, cancelled_reason')
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (runs.error || sends.error) {
    console.error(`[queue] load failed: ${runs.error?.message ?? sends.error?.message}`);
    return { ok: false, error: 'server' };
  }

  return {
    ok: true,
    runs: (runs.data ?? []) as RunRow[],
    sends: (sends.data ?? []) as SendRow[],
  };
}

export async function cancelScheduledSendAction(
  key: string,
  id: string,
  reason: string,
): Promise<CancelResult> {
  const denied = await gate(key);
  if (denied) return { ok: false, error: denied };

  const admin = getAdminClient();

  const { data: row, error } = await admin
    .from('scheduled_sends')
    .select('id, mailchimp_campaign_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    console.error(`[queue] unknown scheduled send ${id}`);
    return { ok: false, error: 'server' };
  }

  // ORDER IS THE WHOLE POINT. Mailchimp first. If this throws we have changed
  // nothing, and the row still reads 'queued', which is true. Marking the row
  // first and failing here would leave a row saying 'cancelled' about a
  // campaign that is still armed to send.
  try {
    await unscheduleCampaign(row.mailchimp_campaign_id as string);
  } catch (err) {
    console.error(
      `[queue] unschedule failed: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return { ok: false, error: 'mailchimp' };
  }

  const { error: rpcError } = await admin.rpc('cancel_scheduled_send', {
    p_id: id,
    p_reason: reason,
  });

  if (rpcError) {
    console.error(`[queue] cancel_scheduled_send: ${rpcError.message}`);
    return { ok: false, error: 'server' };
  }

  return { ok: true };
}
