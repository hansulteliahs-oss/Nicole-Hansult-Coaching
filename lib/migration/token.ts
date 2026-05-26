/**
 * Pure business logic for the migration_tokens table.
 *
 * The actual Supabase row lookup is performed by the caller (a Server
 * Action with the service-role client). This module exists so the
 * validation logic — expiration, used-at check — is fully unit-testable
 * without a database.
 *
 * The migration_tokens table is created manually in the Supabase
 * Dashboard SQL editor; see Plan 04-01 Task 2 for the DDL.
 */

export interface MigrationTokenRow {
  token: string;
  email: string;
  expires_at: string; // ISO timestamp
  used_at: string | null;
}

export type MigrationTokenResult =
  | { ok: true; row: MigrationTokenRow }
  | { ok: false; reason: 'not_found' | 'expired' | 'used' };

export function validateMigrationToken(
  row: MigrationTokenRow | null,
): MigrationTokenResult {
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, row };
}
