/**
 * Cloudflare Turnstile verification.
 *
 * Context: a browser-driven spam bot submitted 481 contact forms between
 * 2026-09-11 and 2026-09-13. It defeats the off-screen honeypot (it only fills
 * visible fields) and paces itself at ~20/hour to stay under the 5-per-60s
 * rate limit. Proof-of-work verification is the layer it cannot forge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { verifyTurnstile, SITEVERIFY_URL } from '@/lib/turnstile';

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('allows the submission when no secret is configured', async () => {
    // Fails open so deploying this code before the key is set cannot take the
    // contact form offline. Protection activates when the key lands.
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyTurnstile('any-token')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a submission carrying no token once a secret is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyTurnstile(undefined)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the secret, token and visitor IP to Cloudflare and accepts a success verdict', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyTurnstile('good-token', '203.0.113.42')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init.method).toBe('POST');

    const sent = new URLSearchParams(init.body as string);
    expect(sent.get('secret')).toBe('secret-key');
    expect(sent.get('response')).toBe('good-token');
    expect(sent.get('remoteip')).toBe('203.0.113.42');
  });

  it('rejects the submission when Cloudflare returns a failure verdict', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      }),
    );

    await expect(verifyTurnstile('forged-token')).resolves.toBe(false);
  });

  it('rejects the submission when the Cloudflare call throws', async () => {
    // Fails closed: an outage must not become an open door for the bot.
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(verifyTurnstile('good-token')).resolves.toBe(false);
  });
});
