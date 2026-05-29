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

describe('lib/content/vibrant40/lessons', () => {
  it('exports 23 lessons in 8 modules, ordered 1..23', async () => {
    const { LESSONS, MODULES, TOTAL_LESSONS, getLesson, getAdjacent } =
      await import('./content/vibrant40/lessons');

    expect(TOTAL_LESSONS).toBe(23);
    expect(LESSONS).toHaveLength(23);
    expect(LESSONS.map((l) => l.order)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    );
    expect(MODULES).toHaveLength(8);
    expect(MODULES.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    for (const l of LESSONS) {
      expect(l).toHaveProperty('title');
      expect(l).toHaveProperty('slug');
      expect(l).toHaveProperty('module');
      expect(l).toHaveProperty('moduleTitle');
    }

    // 11 video lessons carry a signed playback ID; the rest are text (null).
    const videos = LESSONS.filter((l) => l.muxPlaybackId !== null);
    expect(videos).toHaveLength(11);

    expect(getLesson('welcome-to-vibrant40-jumpstart')?.order).toBe(1);
    expect(getLesson('nonexistent')).toBeUndefined();

    expect(getAdjacent(1).prev).toBeNull();
    expect(getAdjacent(1).next?.order).toBe(2);
    expect(getAdjacent(23).next).toBeNull();
  });
});
