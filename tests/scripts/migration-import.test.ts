/**
 * Phase 6 Plan 01 Task 1 — CSV parser + 7-day token TTL helper unit tests.
 *
 * MIG-03: parseMembersCsv keys on Email column case-insensitively, returns
 * trimmed lowercase emails, skips blanks/empty, throws on missing header.
 * migrationExpiry returns a 7-day (default) ISO timestamp.
 *
 * Pure unit tests — no DB, no IO, no network.
 */
import { describe, it, expect } from 'vitest';

import { parseMembersCsv, migrationExpiry, TTL_DAYS } from '@/scripts/migration-import';

// ─── parseMembersCsv ─────────────────────────────────────────────────────────

describe('parseMembersCsv', () => {
  it('keys on "Email" column case-insensitively — lowercase header', () => {
    const csv = 'email,first name,last name\nfoo@example.com,Jane,Doe';
    const result = parseMembersCsv(csv);
    expect(result).toEqual(['foo@example.com']);
  });

  it('keys on "Email" column case-insensitively — uppercase header', () => {
    const csv = 'EMAIL,First Name,Last Name\nBAR@EXAMPLE.COM,John,Smith';
    const result = parseMembersCsv(csv);
    expect(result).toEqual(['bar@example.com']);
  });

  it('returns array of lowercased trimmed emails, one per data row', () => {
    const csv =
      'Email,First Name,Last Name\n  Alice@Example.COM ,Alice,Smith\nbob@example.com,Bob,Jones\n  charlie@example.com  ,Charlie,Brown';
    const result = parseMembersCsv(csv);
    expect(result).toEqual(['alice@example.com', 'bob@example.com', 'charlie@example.com']);
  });

  it('skips blank lines and rows with an empty Email cell', () => {
    const csv = 'Email,First Name,Last Name\nfoo@example.com,Foo,Bar\n\n,empty,name\nbaz@example.com,Baz,Qux\n';
    const result = parseMembersCsv(csv);
    expect(result).toEqual(['foo@example.com', 'baz@example.com']);
  });

  it('throws a clear error if no "Email" header column is present', () => {
    const csv = 'Name,Phone,Zip\nJane Doe,555-1234,92008';
    expect(() => parseMembersCsv(csv)).toThrow(/email/i);
  });

  it('handles fully-quoted Squarespace export (quoted header + cells)', () => {
    // Real Squarespace exports quote every field.
    const csv = '"Email","First Name","Last Name"\n"Jane@Example.com","Jane","Doe"';
    const result = parseMembersCsv(csv);
    expect(result).toEqual(['jane@example.com']);
  });

  it('handles quoted cells containing embedded commas in other columns', () => {
    const csv =
      '"Email","First Name","Billing Address"\n"bob@example.com","Bob","123 Main St, Apt 4"';
    const result = parseMembersCsv(csv);
    expect(result).toEqual(['bob@example.com']);
  });
});

// ─── migrationExpiry ─────────────────────────────────────────────────────────

describe('migrationExpiry', () => {
  it('returns an ISO timestamp exactly ttlDays * 86400000 ms after `now`', () => {
    const now = 1_700_000_000_000; // fixed epoch
    const ttlDays = 3;
    const result = migrationExpiry(now, ttlDays);
    const expected = new Date(now + ttlDays * 86_400_000).toISOString();
    expect(result).toBe(expected);
  });

  it('default TTL is 7 days (MIG-03 — not the 30-day purchase-flow TTL)', () => {
    expect(TTL_DAYS).toBe(7);

    const now = 1_700_000_000_000;
    const result = migrationExpiry(now);
    const expected = new Date(now + 7 * 86_400_000).toISOString();
    expect(result).toBe(expected);
  });
});
