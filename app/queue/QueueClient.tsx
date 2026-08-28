'use client';

/**
 * Passcode gate + the two tables + the cancel button.
 *
 * The passcode is held in component state only — never localStorage. This page
 * can cancel a scheduled send, so a key persisted in a browser is a key left
 * on a phone someone else can pick up.
 */
import { useState } from 'react';

import { Pill } from '@/components/ui/Pill';
import {
  loadQueueAction,
  cancelScheduledSendAction,
  type RunRow,
  type SendRow,
} from '@/lib/actions/queue';

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Los_Angeles',
      })
    : '—';

const DENIALS: Record<string, string> = {
  bad_key: 'Wrong passcode.',
  rate_limited: 'Too many tries. Wait a minute.',
  server: 'Could not read the queue.',
  mailchimp: 'Mailchimp refused the unschedule. Nothing was changed.',
};

export function QueueClient() {
  const [key, setKey] = useState('');
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [sends, setSends] = useState<SendRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError('');
    const res = await loadQueueAction(key);
    setBusy(false);
    if (!res.ok) {
      setError(DENIALS[res.error] ?? 'Something went wrong.');
      return;
    }
    setRuns(res.runs);
    setSends(res.sends);
  }

  async function cancel(id: string) {
    const reason = window.prompt('Why is this being cancelled?');
    if (!reason) return;
    setBusy(true);
    setError('');
    const res = await cancelScheduledSendAction(key, id, reason);
    setBusy(false);
    if (!res.ok) {
      setError(DENIALS[res.error] ?? 'Something went wrong.');
      return;
    }
    await load();
  }

  if (runs === null) {
    return (
      <div className="max-w-sm">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
          placeholder="Passcode"
          className="mb-3 w-full rounded-xl border border-inkFaint bg-card px-4 py-3 text-ink"
        />
        <Pill variant="orchid" size="md" onClick={() => void load()} disabled={busy}>
          {busy ? 'Opening…' : 'Open queue'}
        </Pill>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          Scheduled sends ({sends.filter((s) => s.status === 'queued').length} queued)
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-inkFaint">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-cardSoft text-xs uppercase tracking-wide text-grayDeep">
              <tr>
                <th className="px-4 py-3">Sends</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sends.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-grayDeep" colSpan={4}>
                    Nothing scheduled.
                  </td>
                </tr>
              )}
              {sends.map((s) => (
                <tr key={s.id} className="border-t border-inkFaint">
                  <td className="px-4 py-3 text-ink">{when(s.scheduled_for)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.mailchimp_campaign_id}</td>
                  <td className="px-4 py-3">
                    {s.status}
                    {s.cancelled_reason && (
                      <span className="text-grayDeep"> — {s.cancelled_reason}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === 'queued' && (
                      <button
                        type="button"
                        onClick={() => void cancel(s.id)}
                        disabled={busy}
                        className="text-sm text-red-600 underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Last 50 runs</h2>
        <div className="overflow-x-auto rounded-2xl border border-inkFaint">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-cardSoft text-xs uppercase tracking-wide text-grayDeep">
              <tr>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-grayDeep" colSpan={4}>
                    No runs yet.
                  </td>
                </tr>
              )}
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-inkFaint">
                  <td className="px-4 py-3 text-ink">{when(r.started_at)}</td>
                  <td className="px-4 py-3">{r.kind}</td>
                  <td className="px-4 py-3">
                    {r.status}
                    {r.attempt > 1 && (
                      <span className="text-grayDeep"> (attempt {r.attempt})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-grayDeep">{r.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
