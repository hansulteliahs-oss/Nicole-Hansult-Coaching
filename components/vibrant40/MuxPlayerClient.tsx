/**
 * Phase 5 Plan 05 Task 3 — Mux Player client wrapper.
 *
 * `@mux/mux-player-react` is a client-only Web Component. Wrapping it in a
 * client component keeps the day page itself a Server Component (so we can
 * mint signed tokens server-side per render — PITFALL 7).
 *
 * Captions visible by default (PAY-12) — Vibrant40's audience is 40+ and we
 * want them on without an extra click.
 */
'use client';

import MuxPlayer from '@mux/mux-player-react';

export type MuxPlayerTokens = {
  playback: string;
  thumbnail: string;
  storyboard: string;
};

export function MuxPlayerClient({
  playbackId,
  tokens,
}: {
  playbackId: string;
  tokens: MuxPlayerTokens;
}) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={tokens}
      streamType="on-demand"
      // PAY-12: captions visible by default for 40+ audience
      defaultHiddenCaptions={false}
      accentColor="#5B2C6F"
      metadata={{ video_title: playbackId }}
      style={{ width: '100%', aspectRatio: '16 / 9' }}
    />
  );
}
