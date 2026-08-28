'use client';

/**
 * The one press that schedules the whole batch.
 *
 * Two presses, not one, for the same reason a single newsletter takes two:
 * this arms real sends to the full list and cannot be recalled from here.
 * Cancelling afterwards means /queue.
 */
import { useState } from 'react';

import { Pill } from '@/components/ui/Pill';
import { NEWSLETTER_AUDIENCE_APPROX } from '@/app/approve/approval-state';

type State = 'idle' | 'confirming' | 'working' | 'done' | 'error';

export function BatchClient({ token, count }: { token: string; count: number }) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  async function submit() {
    try {
      const res = await fetch('/api/approve/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
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
      <div className="text-center">
        <h2 className="font-serif text-3xl text-ink mb-4">Scheduled 🎉</h2>
        <p className="text-inkSoft">
          All {count} emails are queued in Mailchimp. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      {state === 'confirming' && (
        <p className="mx-auto mb-6 max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This schedules {count} emails to roughly{' '}
          {NEWSLETTER_AUDIENCE_APPROX.toLocaleString('en-US')} people each. They
          will send on their own at the times listed above.
        </p>
      )}

      <Pill
        variant="orchid"
        size="lg"
        disabled={state === 'working'}
        onClick={() => {
          if (state === 'working') return;
          if (state === 'idle') {
            setState('confirming');
            return;
          }
          setState('working');
          void submit();
        }}
      >
        {state === 'working'
          ? 'Scheduling…'
          : state === 'confirming'
            ? `Yes, schedule all ${count}`
            : state === 'error'
              ? 'Try again'
              : `Review done — schedule ${count} emails`}
      </Pill>

      {state === 'error' && (
        <p className="mt-6 text-sm text-red-600">
          {message}. Please try again, or text Eliahs if it keeps failing.
        </p>
      )}
    </div>
  );
}
