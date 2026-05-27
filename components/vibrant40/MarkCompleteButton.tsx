/**
 * Phase 5 Plan 05 Task 3 — Mark-as-complete button.
 *
 * Client component — wraps `markComplete` Server Action in a useTransition
 * so the button can show a pending state without a full nav. Manual-only
 * (CONTEXT.md decision: no auto-mark-complete on video end).
 */
'use client';

import { useState, useTransition } from 'react';

import { markComplete } from '@/lib/actions/lesson-progress';

export function MarkCompleteButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending || done}
        onClick={() =>
          start(async () => {
            setErrorMsg(null);
            const result = await markComplete(slug);
            if (result.ok) {
              setDone(true);
            } else {
              setErrorMsg(result.error ?? 'Something went wrong.');
            }
          })
        }
        className="inline-flex items-center gap-2 rounded-pill bg-ink px-6 py-3 text-sm font-semibold text-bg transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {done ? 'Marked complete ✓' : pending ? 'Saving…' : 'Mark as complete'}
      </button>
      {errorMsg && (
        <p className="text-sm text-red-700" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
