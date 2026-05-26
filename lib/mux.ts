/**
 * Phase 5 Plan 01 Task 2 — Mux SDK singleton + signed-playback JWT helper.
 *
 * Used by:
 *   - app/vibrant40/days/[slug]/page.tsx (Plan 05) — mints fresh tokens per render
 *
 * PITFALL 7 guard: 6h JWT TTL minimum. Never cache tokens on the client; the
 * caller (RSC) re-mints on every request so long-form viewers (40+) don't get
 * a 403 mid-lesson.
 */
import Mux from '@mux/mux-node';

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
  jwtSigningKey: process.env.MUX_SIGNING_KEY_ID,
  jwtPrivateKey: process.env.MUX_SIGNING_PRIVATE_KEY,
});

export type PlaybackTokens = {
  /** JWT for the video stream itself */
  playback: string;
  /** JWT for thumbnail URLs */
  thumbnail: string;
  /** JWT for the scrubbing storyboard sprite sheet */
  storyboard: string;
};

/**
 * Mint a fresh trio of 6h-TTL playback tokens for a Mux playback ID.
 * Call from a Server Component on every render.
 */
export async function mintPlaybackTokens(playbackId: string): Promise<PlaybackTokens> {
  const [playback, thumbnail, storyboard] = await Promise.all([
    mux.jwt.signPlaybackId(playbackId, { expiration: '6h', type: 'video' }),
    mux.jwt.signPlaybackId(playbackId, { expiration: '6h', type: 'thumbnail' }),
    mux.jwt.signPlaybackId(playbackId, { expiration: '6h', type: 'storyboard' }),
  ]);
  return { playback, thumbnail, storyboard };
}
