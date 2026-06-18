'use client';

/**
 * Client half of /approve — the actual "Approve & Publish" button.
 * POSTs the token to /api/approve (which resumes the n8n workflow) and
 * renders the outcome inline. Idempotency lives server-side (approval_tokens),
 * so a double-tap is safe.
 */
import { useState } from 'react';

import { Pill } from '@/components/ui/Pill';

type State = 'idle' | 'working' | 'done' | 'error';

export function ApproveClient({
  token,
  kind,
}: {
  token: string;
  kind: 'post' | 'newsletter';
}) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  const label = kind === 'newsletter' ? 'Newsletter' : 'Post';

  async function approve() {
    setState('working');
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

  if (state === 'done') {
    return (
      <>
        <h1 className="font-serif text-4xl text-ink mb-4">Published 🎉</h1>
        <p className="text-inkSoft">
          Your {label.toLowerCase()} is on its way. You can close this tab.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-serif text-4xl text-ink mb-4">
        Approve this {label.toLowerCase()}?
      </h1>
      <p className="text-inkSoft mb-8">
        Tapping below will publish it. Nothing goes out until you do.
      </p>
      <Pill variant="orchid" size="lg" onClick={approve} disabled={state === 'working'}>
        {state === 'working' ? 'Publishing…' : `Approve & Publish ${label}`}
      </Pill>
      {state === 'error' && (
        <p className="mt-6 text-sm text-red-600">
          {message} — please try again, or text Eliahs if it keeps failing.
        </p>
      )}
    </>
  );
}
