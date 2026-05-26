/**
 * Dynamic favicon — Next.js 16 dynamic icon convention.
 *
 * Renders a 32×32 PNG at build time. Served at /icon (not /favicon.ico) —
 * Next 16 auto-injects <link rel="icon" href="/icon..."> when this file
 * exists. The Plan-01 transparent app/favicon.ico has been removed.
 *
 * Visual: Mist bg with a single orchid radial-gradient dot (Nicole logomark
 * dot, simplified for 32×32). Brand-fidelity hand-crafted .ico can replace
 * this later if Nicole wants pixel-perfect — for Phase 1 the goal is
 * "browser tab shows Mist colors, not a generic globe."
 */
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#EBE6DE',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 30% 30%, #EFD8EB 0%, #B86BAE 70%)',
          }}
        />
      </div>
    ),
    size,
  );
}
