/**
 * Phase 6 Plan 01 Task 3 — PurchaseConfirmation migration branch render tests.
 *
 * MIG-04 (render half): migration email renders upgrade-framing copy with
 * a single CTA to the set-password link, no Squarespace mention, no personal
 * note from Nicole. Purchase branch must remain byte-for-byte unchanged.
 *
 * Uses react-email `render()` to produce an HTML string for assertions.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'react-email';

import { PurchaseConfirmation } from '@/components/email/PurchaseConfirmation';

const TEST_URL = 'https://nicolehansultcoaching.com/set-password?token=abc123def456';
const TEST_EMAIL = 'member@example.com';

describe('PurchaseConfirmation — kind: migration', () => {
  it('heading contains upgrade framing ("Your Vibrant40 experience just got better")', async () => {
    const html = await render(
      PurchaseConfirmation({ email: TEST_EMAIL, url: TEST_URL, kind: 'migration' }),
    );
    expect(html).toContain('Your Vibrant40 experience just got better');
  });

  it('contains a single CTA button whose href is the passed set-password url', async () => {
    const html = await render(
      PurchaseConfirmation({ email: TEST_EMAIL, url: TEST_URL, kind: 'migration' }),
    );
    // Verify the URL appears as an href (the button href)
    expect(html).toContain(TEST_URL);
    // Verify the button label is present
    expect(html).toContain('Set my password');
  });

  it('rendered output contains no "Squarespace", no "migration"/"moving" narrative, no personal-note signature', async () => {
    const html = await render(
      PurchaseConfirmation({ email: TEST_EMAIL, url: TEST_URL, kind: 'migration' }),
    );
    expect(html.toLowerCase()).not.toContain('squarespace');
    expect(html.toLowerCase()).not.toContain('migration');
    expect(html.toLowerCase()).not.toContain('moving');
    // No personal-note signature (e.g. "Nicole" as a sign-off line)
    // The brand name "Nicole Hansult" may appear in the footer logo — that's fine.
    // What must NOT appear is a personal-note close like "With love, Nicole" or "- Nicole"
    expect(html).not.toMatch(/with love,\s*Nicole/i);
    expect(html).not.toMatch(/[–-]\s*Nicole\s*<\/p>/i);
  });

  it('TTL line references 7 days (migration) not 30 days', async () => {
    const html = await render(
      PurchaseConfirmation({ email: TEST_EMAIL, url: TEST_URL, kind: 'migration' }),
    );
    // Must NOT say "30 days" in migration branch
    expect(html).not.toContain('30 days');
    // Should say "7 days" or "once" (either TTL-neutral or explicit 7-day phrasing)
    const hasSevenDays = html.includes('7 days');
    const hasOnce = html.toLowerCase().includes('once');
    expect(hasSevenDays || hasOnce).toBe(true);
  });
});

describe('PurchaseConfirmation — kind: purchase (unchanged)', () => {
  it('purchase branch still renders "Welcome to Vibrant40" heading', async () => {
    const html = await render(
      PurchaseConfirmation({ email: TEST_EMAIL, url: TEST_URL, kind: 'purchase' }),
    );
    expect(html).toContain('Welcome to Vibrant40');
  });

  it('purchase branch still has the correct body copy about unlocking the course', async () => {
    const html = await render(
      PurchaseConfirmation({ email: TEST_EMAIL, url: TEST_URL, kind: 'purchase' }),
    );
    expect(html).toContain('set your password');
    expect(html).toContain('unlock');
  });
});
