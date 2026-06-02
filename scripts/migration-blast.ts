/**
 * Phase 6 Plan 01 — Migration email blast script.
 *
 * Reads migration-report.json (output of migration-import.ts), then sends one
 * Resend migration email per row using PurchaseConfirmation{ kind: 'migration' }.
 *
 * Sender reuses the warmed mail.nicolehansultcoaching.com domain (Phase 3 warm-up
 * started 2026-05-26 — do NOT introduce a new local-part or sender domain).
 *
 * replyTo = the member's OWN email address (Phase 3 thread-context pattern) so
 * Nicole's manual follow-ups thread correctly inside that member's inbox.
 *
 * Run:
 *   npx tsx scripts/migration-blast.ts               # --dry-run is the default
 *   npx tsx scripts/migration-blast.ts --no-dry-run  # live send (Plan 03)
 *
 * Options:
 *   --dry-run      (default) Log each intended send; DO NOT call Resend.
 *   --no-dry-run   Actually send emails via Resend API.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { Resend } from 'resend';

import { PurchaseConfirmation } from '@/components/email/PurchaseConfirmation';

// ─── Batching scaffold ───────────────────────────────────────────────────────
// Documented playbook for future real rollouts with large member lists.
// At the current zero-real-member reality (CONTEXT) a single row is sent.
// For N > 25 members: batch into groups of 10–25 and sleep 1–2s between batches
// to stay well within Resend rate limits (100 req/s burst, plan-dependent daily).
// Example:
//   const BATCH_SIZE = 25;
//   const SLEEP_MS = 1500;
//   for (let i = 0; i < rows.length; i += BATCH_SIZE) {
//     const batch = rows.slice(i, i + BATCH_SIZE);
//     await Promise.all(batch.map(sendRow));
//     if (i + BATCH_SIZE < rows.length) await sleep(SLEEP_MS);
//   }
// async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
// ─────────────────────────────────────────────────────────────────────────────

type ReportRow = { email: string; token: string; url: string };

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--no-dry-run');
  const reportPath = args.find((a) => !a.startsWith('--')) ?? './migration-report.json';

  const report: ReportRow[] = JSON.parse(readFileSync(reportPath, 'utf-8'));

  console.log(`\nMigration blast — ${report.length} row(s) in report.`);
  if (isDryRun) {
    console.log('DRY RUN mode — no emails will be sent.\n');
  } else {
    console.log('LIVE mode — emails WILL be sent via Resend.\n');
  }

  const FROM =
    process.env.RESEND_FROM_EMAIL ?? 'Nicole <nicole@mail.nicolehansultcoaching.com>';
  const SUBJECT = 'Your Vibrant40 experience just got better';

  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let errors = 0;

  for (const row of report) {
    if (isDryRun) {
      console.log(`  [dry-run] to=${row.email} subject="${SUBJECT}" url=${row.url}`);
      sent++;
      continue;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: [row.email],
        replyTo: row.email, // member's own address — threads Nicole's follow-ups correctly
        subject: SUBJECT,
        react: PurchaseConfirmation({ email: row.email, url: row.url, kind: 'migration' }),
      });

      if (error) {
        console.error(`  [error] ${row.email}:`, error);
        errors++;
      } else {
        console.log(`  [sent]  ${row.email} → ${data?.id}`);
        sent++;
      }
    } catch (err) {
      console.error(`  [exception] ${row.email}:`, err);
      errors++;
    }
  }

  console.log(`\nSent:   ${sent}`);
  if (errors > 0) {
    console.error(`Errors: ${errors}`);
    process.exit(1);
  }
  console.log('Done.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
