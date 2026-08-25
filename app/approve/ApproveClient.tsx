'use client';

/**
 * Client half of /approve — the approve button.
 *
 * POSTs the token to /api/approve (which resumes the n8n workflow) and renders
 * the outcome inline. Idempotency lives server-side (approval_tokens), so a
 * double-tap is safe.
 *
 * The draft itself is rendered above this by DraftPreview.
 *
 * Newsletters take two presses. See app/approve/approval-state.ts for why.
 */
import { useState } from 'react';

import { Pill } from '@/components/ui/Pill';

import {
  nextOnPress,
  pressLabel,
  NEWSLETTER_AUDIENCE_APPROX,
  type ApproveState,
} from './approval-state';

export function ApproveClient({
  token,
  kind,
}: {
  token: string;
  kind: 'post' | 'newsletter';
}) {
  const [state, setState] = useState<ApproveState>('idle');
  const [message, setMessage] = useState('');

  const label = kind === 'newsletter' ? 'Newsletter' : 'Post';

  async function submit() {
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, kind }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setState('done');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function press() {
    const next = nextOnPress(state, kind);
    setState(next.state);
    if (next.submit) void submit();
  }

  if (state === 'done') {
    return (
      <>
        <h2 className="font-serif text-3xl text-ink mb-4">
          {kind === 'newsletter' ? 'Sent 🎉' : 'Published 🎉'}
        </h2>
        <p className="text-inkSoft">
          Your {label.toLowerCase()} is on its way. You can close this tab.
        </p>
      </>
    );
  }

  return (
    <div className="text-center">
      <p className="text-inkSoft mb-6">
        {kind === 'newsletter'
          ? 'Read it above. Nothing goes out until you press send.'
          : 'Read it above. Nothing publishes until you press approve.'}
      </p>

      {state === 'confirming' && (
        <p className="mx-auto mb-6 max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This sends the newsletter to roughly{' '}
          {NEWSLETTER_AUDIENCE_APPROX.toLocaleString('en-US')} people. It is not a
          test and it cannot be recalled.
        </p>
      )}

      <Pill
        variant="orchid"
        size="lg"
        onClick={press}
        disabled={state === 'working'}
      >
        {pressLabel(state, kind)}
      </Pill>

      {state === 'error' && (
        <p className="mt-6 text-sm text-red-600">
          {message}. Please try again, or text Eliahs if it keeps failing.
        </p>
      )}
    </div>
  );
}
