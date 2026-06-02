/**
 * Phase 6 Plan 01 — Member migration import script.
 *
 * 7-day TTL per MIG-03 — tighter than the 30-day purchase-flow path in
 * handle-checkout-completed.ts, which is intentionally left untouched (a
 * coordinated blast emails members immediately; a buyer may act later).
 *
 * Run once against the real CSV:
 *   npx tsx scripts/migration-import.ts [path/to/members.csv]
 *
 * Options:
 *   --dry-run  Still performs the DB writes (so the dry-run member row exists),
 *              but prints the intended blast recipients without sending email.
 *              The --dry-run flag is interpreted by the blast script (Task 3).
 */

// ─── Pure helpers (exported for unit tests) ──────────────────────────────────

/**
 * Splits a CSV text into a list of lowercased, trimmed email addresses.
 *
 * Assumptions:
 *  - Header row is present.
 *  - Column whose trimmed-lowercased name is "email" provides the addresses.
 *  - Simple comma split — quoted-comma edge cases are out of scope for the
 *    dry-run (Squarespace customer exports are flat).
 *
 * @throws if no "email" column is found in the header.
 */
export function parseMembersCsv(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/);

  // Find first non-empty line as header
  const headerLineIndex = lines.findIndex((l) => l.trim().length > 0);
  if (headerLineIndex === -1) {
    throw new Error('parseMembersCsv: CSV is empty — no header row found.');
  }

  const headers = lines[headerLineIndex].split(',').map((h) => h.trim().toLowerCase());
  const emailIndex = headers.indexOf('email');
  if (emailIndex === -1) {
    throw new Error(
      `parseMembersCsv: No "email" column found in header row. ` +
        `Found columns: ${headers.join(', ')}`,
    );
  }

  const emails: string[] = [];
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // skip blank lines

    const cells = line.split(',');
    const raw = cells[emailIndex] ?? '';
    const email = raw.trim().toLowerCase();
    if (!email) continue; // skip rows with empty Email cell

    emails.push(email);
  }

  return emails;
}

/** 7-day TTL per MIG-03. */
export const TTL_DAYS = 7;

/**
 * Returns an ISO timestamp `ttlDays` days after `now`.
 * Defaults: now = Date.now(), ttlDays = TTL_DAYS (7).
 */
export function migrationExpiry(now: number = Date.now(), ttlDays: number = TTL_DAYS): string {
  return new Date(now + ttlDays * 86_400_000).toISOString();
}

// ─── Executable main (DB writes + report output) ─────────────────────────────

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase/admin';

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith('--')) ?? './migration-members.csv';

  const csvText = readFileSync(csvPath, 'utf-8');
  const emails = parseMembersCsv(csvText);
  const csvRows = emails.length;

  console.log(`\nMigration import — ${csvRows} row(s) found in CSV.`);

  if (csvRows === 0) {
    console.error('No emails parsed from CSV. Exiting.');
    process.exit(1);
  }

  const supabase = getAdminClient();
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicolehansultcoaching.com';

  type ReportRow = { email: string; token: string; url: string };
  const report: ReportRow[] = [];

  let membersUpserted = 0;
  let tokensIssued = 0;

  for (const email of emails) {
    // 1. Idempotent member upsert (ON CONFLICT DO NOTHING semantics).
    const { error: memberErr } = await supabase
      .from('vibrant40_members')
      .upsert({ email, status: 'active' }, { onConflict: 'email', ignoreDuplicates: true });

    if (memberErr) {
      console.error(`[member upsert] ${email}:`, memberErr.message);
      process.exit(1);
    }
    membersUpserted++;

    // 2. Refresh token cleanly: delete any unused token, then insert a fresh one.
    //    This prevents stacking duplicate unused tokens on re-run.
    await supabase.from('migration_tokens').delete().eq('email', email).is('used_at', null);

    const token = randomBytes(32).toString('hex');
    const expires_at = migrationExpiry();

    const { error: tokenErr } = await supabase.from('migration_tokens').insert({
      token,
      email,
      expires_at,
    });

    if (tokenErr) {
      console.error(`[token insert] ${email}:`, tokenErr.message);
      process.exit(1);
    }
    tokensIssued++;

    const url = `${SITE_URL}/set-password?token=${token}`;
    report.push({ email, token, url });
    console.log(`  [ok] ${email} → token issued, expires ${expires_at}`);
  }

  // 3. Parity assertion.
  if (membersUpserted !== csvRows || tokensIssued !== csvRows) {
    console.error(
      `Parity mismatch: CSV rows=${csvRows}, members upserted=${membersUpserted}, tokens issued=${tokensIssued}`,
    );
    process.exit(1);
  }

  // 4. Write migration-report.json (excluded by verify-no-squarespace.sh).
  writeFileSync('migration-report.json', JSON.stringify(report, null, 2));

  console.log(`\nRows read:        ${csvRows}`);
  console.log(`Members upserted: ${membersUpserted}`);
  console.log(`Tokens issued:    ${tokensIssued}`);
  console.log(`Report written:   migration-report.json\n`);
}

// Only run main() when this script is executed directly (not when imported by tests).
if (
  process.argv[1] &&
  (process.argv[1].endsWith('migration-import.ts') ||
    process.argv[1].endsWith('migration-import.js'))
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
