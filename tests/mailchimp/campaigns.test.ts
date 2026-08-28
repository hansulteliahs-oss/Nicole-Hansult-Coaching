/**
 * lib/mailchimp/campaigns — create / content / schedule / send / unschedule.
 *
 * fetch is stubbed; nothing here touches Mailchimp. The assertions that matter
 * are (a) every helper throws on a non-OK response, and (b) schedule refuses a
 * time Mailchimp would reject, because a rejected schedule four weeks before
 * cart open is a launch that silently does not happen.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  assertQuarterHour,
  createCampaign,
  setCampaignContent,
  scheduleCampaign,
  sendCampaign,
  unscheduleCampaign,
  mailchimpConfig,
} from '@/lib/mailchimp/campaigns';

type Call = { url: string; init: RequestInit };
let calls: Call[];

function stubFetch(response: { ok: boolean; status: number; body?: string }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: response.ok,
        status: response.status,
        text: async () => response.body ?? '',
      } as unknown as Response;
    }),
  );
}

beforeEach(() => {
  calls = [];
  process.env.MAILCHIMP_API_KEY = 'key123-us21';
  process.env.MAILCHIMP_FROM_NAME = 'Nicole Hansult';
  process.env.MAILCHIMP_REPLY_TO = 'nicole@mail.nicolehansultcoaching.com';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mailchimpConfig', () => {
  it('derives the data-centre server from the key suffix', () => {
    expect(mailchimpConfig().server).toBe('us21');
  });

  it('throws when the from-name is missing rather than sending as nobody', () => {
    delete process.env.MAILCHIMP_FROM_NAME;
    expect(() => mailchimpConfig()).toThrow(/MAILCHIMP_FROM_NAME/);
  });

  it('throws when the API key is missing', () => {
    delete process.env.MAILCHIMP_API_KEY;
    expect(() => mailchimpConfig()).toThrow(/MAILCHIMP_API_KEY/);
  });
});

describe('assertQuarterHour', () => {
  it('accepts a quarter-hour boundary', () => {
    expect(() => assertQuarterHour(new Date('2026-09-28T16:15:00.000Z'))).not.toThrow();
  });

  it('rejects 16:20', () => {
    expect(() => assertQuarterHour(new Date('2026-09-28T16:20:00.000Z'))).toThrow(
      /quarter-hour/i,
    );
  });

  it('rejects a stray seconds value', () => {
    expect(() => assertQuarterHour(new Date('2026-09-28T16:15:30.000Z'))).toThrow(
      /quarter-hour/i,
    );
  });
});

describe('createCampaign', () => {
  it('posts a regular campaign to the named list and returns the id', async () => {
    stubFetch({ ok: true, status: 200, body: JSON.stringify({ id: 'abc123' }) });

    const id = await createCampaign({
      listId: 'f531604a9a',
      subject: 'Stairs, knees, quads',
      previewText: 'The short version',
      title: 'Weekly 2026-09-15',
    });

    expect(id).toBe('abc123');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://us21.api.mailchimp.com/3.0/campaigns');
    expect(calls[0].init.method).toBe('POST');

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.type).toBe('regular');
    expect(body.recipients.list_id).toBe('f531604a9a');
    expect(body.recipients.segment_opts).toBeUndefined();
    expect(body.settings.subject_line).toBe('Stairs, knees, quads');
    expect(body.settings.from_name).toBe('Nicole Hansult');
  });

  it('attaches a saved segment when one is supplied', async () => {
    stubFetch({ ok: true, status: 200, body: JSON.stringify({ id: 'abc123' }) });

    await createCampaign({
      listId: 'f531604a9a',
      segmentId: '4821',
      subject: 'Sugar Cravings reintroduction',
      title: 'Warm-up',
    });

    const body = JSON.parse(calls[0].init.body as string);
    expect(body.recipients.segment_opts).toEqual({ saved_segment_id: 4821 });
  });

  it('refuses a non-numeric segment id instead of silently sending to everyone', async () => {
    stubFetch({ ok: true, status: 200, body: JSON.stringify({ id: 'abc123' }) });

    await expect(
      createCampaign({
        listId: 'f531604a9a',
        segmentId: 'sugar-cravings',
        subject: 's',
        title: 't',
      }),
    ).rejects.toThrow(/not numeric/i);
  });

  it('throws on a non-OK response and includes the body', async () => {
    stubFetch({ ok: false, status: 400, body: '{"detail":"bad list"}' });

    await expect(
      createCampaign({ listId: 'nope', subject: 's', title: 't' }),
    ).rejects.toThrow(/400.*bad list/s);
  });

  it('throws when Mailchimp returns 200 with no id', async () => {
    stubFetch({ ok: true, status: 200, body: '{}' });

    await expect(
      createCampaign({ listId: 'f531604a9a', subject: 's', title: 't' }),
    ).rejects.toThrow(/no campaign id/i);
  });
});

describe('setCampaignContent / send / schedule / unschedule', () => {
  it('PUTs the html to the content endpoint', async () => {
    stubFetch({ ok: true, status: 200, body: '{}' });
    await setCampaignContent('abc123', '<p>hi</p>');

    expect(calls[0].url).toBe('https://us21.api.mailchimp.com/3.0/campaigns/abc123/content');
    expect(calls[0].init.method).toBe('PUT');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ html: '<p>hi</p>' });
  });

  it('sends, tolerating the empty 204 body Mailchimp returns', async () => {
    stubFetch({ ok: true, status: 204, body: '' });
    await expect(sendCampaign('abc123')).resolves.toBeUndefined();

    expect(calls[0].url).toBe(
      'https://us21.api.mailchimp.com/3.0/campaigns/abc123/actions/send',
    );
    expect(calls[0].init.method).toBe('POST');
  });

  it('schedules at a quarter-hour boundary', async () => {
    stubFetch({ ok: true, status: 204, body: '' });
    await scheduleCampaign('abc123', new Date('2026-09-28T16:00:00.000Z'));

    expect(calls[0].url).toBe(
      'https://us21.api.mailchimp.com/3.0/campaigns/abc123/actions/schedule',
    );
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      schedule_time: '2026-09-28T16:00:00.000Z',
    });
  });

  it('refuses to schedule off-boundary without calling Mailchimp at all', async () => {
    stubFetch({ ok: true, status: 204, body: '' });

    await expect(
      scheduleCampaign('abc123', new Date('2026-09-28T16:07:00.000Z')),
    ).rejects.toThrow(/quarter-hour/i);
    expect(calls).toHaveLength(0);
  });

  it('unschedules', async () => {
    stubFetch({ ok: true, status: 204, body: '' });
    await unscheduleCampaign('abc123');

    expect(calls[0].url).toBe(
      'https://us21.api.mailchimp.com/3.0/campaigns/abc123/actions/unschedule',
    );
  });

  it('throws when a send is refused', async () => {
    stubFetch({ ok: false, status: 500, body: 'boom' });
    await expect(sendCampaign('abc123')).rejects.toThrow(/500.*boom/s);
  });
});
