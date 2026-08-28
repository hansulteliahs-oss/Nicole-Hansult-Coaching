/**
 * Mailchimp Marketing API v3 — campaign create, content, schedule, send,
 * unschedule.
 *
 * All of this lived in the n8n workflow. `lib/mailchimp.ts` only ever held
 * addSubscriber, so every send path had to be written here in TypeScript as
 * part of the rebuild.
 *
 * THROWS ON EVERYTHING. addSubscriber next door is deliberately fail-soft so a
 * misconfiguration can never break the lead-magnet form. A send is the
 * opposite: campaign 3f4c79f8f0 went to 1,110 people on 2026-07-28 and looked
 * fine, and "it looked fine" is the failure class this rebuild exists to kill.
 * Callers decide what to do with the throw; nothing here swallows one.
 */
const API_ROOT = (server: string) => `https://${server}.api.mailchimp.com/3.0`;

export type MailchimpConfig = {
  apiKey: string;
  server: string;
  fromName: string;
  replyTo: string;
};

/**
 * Read config at call time, not at module load. Missing env then surfaces at
 * request time with a name attached, matching lib/supabase/admin.ts.
 */
export function mailchimpConfig(): MailchimpConfig {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const fromName = process.env.MAILCHIMP_FROM_NAME;
  const replyTo = process.env.MAILCHIMP_REPLY_TO;

  const missing: string[] = [];
  if (!apiKey) missing.push('MAILCHIMP_API_KEY');
  if (!fromName) missing.push('MAILCHIMP_FROM_NAME');
  if (!replyTo) missing.push('MAILCHIMP_REPLY_TO');
  if (missing.length > 0) {
    throw new Error(`Mailchimp campaigns are not configured: ${missing.join(', ')} unset.`);
  }

  // Keys are suffixed with the data-centre prefix, e.g. "abc123-us21".
  const server = apiKey!.split('-')[1];
  if (!server) {
    throw new Error('MAILCHIMP_API_KEY has no data-centre suffix (expected "<key>-us21").');
  }

  return { apiKey: apiKey!, server, fromName: fromName!, replyTo: replyTo! };
}

async function call(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
): Promise<unknown> {
  const { apiKey, server } = mailchimpConfig();

  const res = await fetch(`${API_ROOT(server)}${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`any:${apiKey}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mailchimp ${method} ${path} failed (${res.status}): ${text}`);
  }
  // The action endpoints answer 204 with an empty body.
  return text ? JSON.parse(text) : null;
}

/**
 * Mailchimp rejects a schedule_time that is not on a 15-minute boundary. It
 * does so with a 400 at schedule time, which during a launch batch reads as
 * "nothing went out" long after anyone is watching. Fail here instead.
 */
export function assertQuarterHour(when: Date): void {
  if (Number.isNaN(when.getTime())) {
    throw new Error('scheduleCampaign: invalid date');
  }
  const offBoundary =
    when.getUTCMinutes() % 15 !== 0 ||
    when.getUTCSeconds() !== 0 ||
    when.getUTCMilliseconds() !== 0;

  if (offBoundary) {
    throw new Error(
      `scheduleCampaign: Mailchimp only accepts quarter-hour schedule times; got ${when.toISOString()}`,
    );
  }
}

export async function createCampaign(args: {
  listId: string;
  segmentId?: string | null;
  subject: string;
  previewText?: string | null;
  title: string;
}): Promise<string> {
  const { fromName, replyTo } = mailchimpConfig();

  const recipients: {
    list_id: string;
    segment_opts?: { saved_segment_id: number };
  } = { list_id: args.listId };

  if (args.segmentId) {
    // "Sugar Cravings" exists as list ecacfdabed (150) AND as a saved segment
    // on the main list (127). Sending to the wrong one is silent, so a segment
    // id that is not a number is a bug we refuse rather than one we discover
    // from an open-rate report.
    const saved = Number(args.segmentId);
    if (!Number.isInteger(saved)) {
      throw new Error(`createCampaign: segment id "${args.segmentId}" is not numeric`);
    }
    recipients.segment_opts = { saved_segment_id: saved };
  }

  const data = (await call('/campaigns', 'POST', {
    type: 'regular',
    recipients,
    settings: {
      subject_line: args.subject,
      preview_text: args.previewText ?? undefined,
      title: args.title,
      from_name: fromName,
      reply_to: replyTo,
    },
  })) as { id?: string } | null;

  if (!data?.id) {
    throw new Error('createCampaign: Mailchimp returned no campaign id');
  }
  return data.id;
}

export async function setCampaignContent(campaignId: string, html: string): Promise<void> {
  await call(`/campaigns/${campaignId}/content`, 'PUT', { html });
}

export async function scheduleCampaign(campaignId: string, when: Date): Promise<void> {
  assertQuarterHour(when);
  await call(`/campaigns/${campaignId}/actions/schedule`, 'POST', {
    schedule_time: when.toISOString(),
  });
}

export async function sendCampaign(campaignId: string): Promise<void> {
  await call(`/campaigns/${campaignId}/actions/send`, 'POST');
}

export async function unscheduleCampaign(campaignId: string): Promise<void> {
  await call(`/campaigns/${campaignId}/actions/unschedule`, 'POST');
}
