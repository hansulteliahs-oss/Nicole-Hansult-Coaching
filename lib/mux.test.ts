/**
 * Phase 5 Plan 01 Task 2 — Mux SDK singleton + signed playback helper.
 *
 * Uses vi.mock() to swap @mux/mux-node so the test doesn't need real Mux
 * credentials (env vars are stubbed minimally to satisfy module init).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

const signMock = vi.fn(async (playbackId: string, opts: { expiration: string; type: string }) => {
  return `jwt.${opts.type}.${playbackId}.${opts.expiration}`;
});

vi.mock('@mux/mux-node', () => {
  class MockMux {
    jwt = { signPlaybackId: signMock };
    constructor(_opts: unknown) {}
  }
  return { default: MockMux };
});

beforeAll(() => {
  vi.stubEnv('MUX_TOKEN_ID', 'test_token_id');
  vi.stubEnv('MUX_TOKEN_SECRET', 'test_token_secret');
  vi.stubEnv('MUX_SIGNING_KEY_ID', 'test_signing_key_id');
  vi.stubEnv('MUX_SIGNING_PRIVATE_KEY', 'test_private_key_base64');
});

describe('lib/mux — mintPlaybackTokens', () => {
  it('returns playback/thumbnail/storyboard JWTs for the given playbackId', async () => {
    const { mintPlaybackTokens } = await import('./mux');
    const tokens = await mintPlaybackTokens('PLAYBACK_ABC');

    expect(tokens).toHaveProperty('playback');
    expect(tokens).toHaveProperty('thumbnail');
    expect(tokens).toHaveProperty('storyboard');
    expect(typeof tokens.playback).toBe('string');
    expect(tokens.playback.length).toBeGreaterThan(0);
    expect(tokens.thumbnail.length).toBeGreaterThan(0);
    expect(tokens.storyboard.length).toBeGreaterThan(0);
  });

  it('passes expiration: "6h" to signPlaybackId for every token type', async () => {
    signMock.mockClear();
    const { mintPlaybackTokens } = await import('./mux');
    await mintPlaybackTokens('PLAYBACK_XYZ');

    expect(signMock).toHaveBeenCalledTimes(3);
    for (const call of signMock.mock.calls) {
      const [, opts] = call;
      expect(opts.expiration).toBe('6h');
    }
    const types = signMock.mock.calls.map((c) => c[1].type).sort();
    expect(types).toEqual(['storyboard', 'thumbnail', 'video']);
  });
});

describe('lib/content/vibrant40/days', () => {
  it('exports DAYS with 8 entries, slugs day-1 through day-8', async () => {
    const { DAYS, getDay } = await import('./content/vibrant40/days');
    expect(DAYS).toHaveLength(8);
    const slugs = DAYS.map((d) => d.slug);
    expect(slugs).toEqual([
      'day-1', 'day-2', 'day-3', 'day-4',
      'day-5', 'day-6', 'day-7', 'day-8',
    ]);
    for (const d of DAYS) {
      expect(d).toHaveProperty('title');
      expect(d).toHaveProperty('description');
      expect(d).toHaveProperty('muxPlaybackId');
      expect(d).toHaveProperty('order');
    }
    expect(getDay('day-3')?.order).toBe(3);
    expect(getDay('nonexistent')).toBeUndefined();
  });
});
