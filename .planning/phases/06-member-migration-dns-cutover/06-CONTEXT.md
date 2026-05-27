# Phase 6: Member Migration + DNS Cutover - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Move every existing Vibrant40 member to the new site with access intact, then flip `nicolehansultcoaching.com` from Squarespace to Vercel. Phase 6 owns: CSV import script, migration token blast, DNS TTL pre-lowering, A/CNAME flip, post-cutover smoke test, and Squarespace subscription hold.

Does NOT include: new feature work, course content changes, admin UI, payment plan variations.

**Critical context:** As of 2026-05-27 there are **zero real Vibrant40 members** on Squarespace — Eliahs joined as a test account only. The migration blast is a dry-run against the test row. The import script and blast mechanics are built production-ready for future real members, but no real coordinated rollout is needed for launch.

</domain>

<decisions>
## Implementation Decisions

### Member count + blast strategy
- **Zero real members to migrate.** Eliahs's test account is the only Squarespace member.
- **The blast is a dry-run:** run the import script + Resend blast against the test row to verify the full flow (email arrives, set-password link works, video plays), then proceed to DNS cutover.
- **Migration script is built production-ready** — handles any future CSV export from Squarespace if real members exist at some later point.
- **Sequence:** dry-run blast FIRST, then DNS flip. Not the other way around.
- **Same-day gate:** if the dry-run blast passes by noon, flip DNS that afternoon. No mandatory 24–48h buffer once everything is confirmed green.

### Migration email copy
- **Upgrade framing.** Subject and body lead with benefit: "Your Vibrant40 experience just got better." No mention of Squarespace, no migration narrative, no "we're moving."
- **Clean brand email — no personal note from Nicole.** Consistent with purchase confirmation email. Nicole's voice is in the course content itself.
- **Template:** reuse existing `PurchaseConfirmation.tsx` with `kind: 'migration'` discriminator. Write real production copy in Phase 6 (not placeholder), since the same template fires for future new members who bought on the old site.
- Copy must include: upgrade headline, one-sentence context ("Set your password to access your Vibrant40 content on the new site"), single CTA button → `/set-password?token=...`, and the standard BrandedLayout footer.

### DNS flip execution
- **Green-light gate (all three must be true before flipping):**
  1. Sentry deliberate test error triggers and email arrives at `hansulteliahs@gmail.com`
  2. Preview URL smoke test passes all checks (public site, checkout, set-password flow)
  3. `dig nicolehansultcoaching.com` shows 300s TTL (pre-lowered at T-48h)
- **Execution window:** weekday morning, 9–11am Pacific. Not Friday.
- **Rollback:** if something is clearly broken within 30 min of flip, revert A/CNAME in Squarespace Domains panel. 300s TTL means recovery in ~5 min. Squarespace subscription stays paid 30 days post-cutover as the rollback target.
- **DNS host:** Squarespace Domains panel (registrar Tucows via reseller). No external DNS management needed.

### Non-redeemer follow-up plan
- **Documented playbook only — no code or automation for Phase 6.** Zero real members means zero urgency for tooling now.
- **Playbook:** If a real member hasn't clicked their set-password link within 7 days of the blast:
  1. Check `migration_tokens` table for `used_at IS NULL AND expires_at < now()` rows.
  2. Nicole sends a personal email from her Gmail directly to the member. The migration email's `reply_to` is set to the member's address so thread context is there.
  3. If no reply after 3 days, Nicole can text/DM if she has a personal relationship with that member.
  4. Re-issue a fresh 30-day token via the `/set-password/expired` self-service flow if needed.
- No automated Resend nudge email. Manual touch is appropriate for a premium coaching product.

### Claude's Discretion
- Exact CSV column mapping from Squarespace export format (researcher will document the real export schema)
- Whether the import script is a standalone Node.js script or a one-time Supabase SQL import
- Migration token expiry for the blast: MIG-03 says 7-day; Phase 4 created table with 30-day default. Researcher to confirm whether 7-day is enforced at the script level or if 30-day is fine for a dry-run scenario with zero real members
- Post-cutover Stripe webhook URL update (currently pointing at `nicole-hansult-coaching.vercel.app` preview URL — swap to apex domain in Stripe Dashboard after flip)
- Exact `dig` command + network check script for the three-network TTL verification

</decisions>

<specifics>
## Specific Ideas

- **The dry-run against the test row IS the phase's migration test.** Don't treat it as "just a test" — execute it exactly as if Eliahs were a real member: real Resend email sent, real set-password flow clicked, real video watched. This is what MIG-02's success criterion means for a zero-member scenario.
- **Stripe webhook URL must be updated post-flip.** Currently registered against the Vercel preview URL. After DNS flip, update the Stripe Dashboard live webhook endpoint to `https://nicolehansultcoaching.com/api/webhooks/stripe`. This is in the post-cutover smoke test checklist (MIG-11 adjacent).
- **Google Search Console sitemap re-submission is post-flip day-of.** Don't forget — it's in MIG-09 and easy to skip when you're focused on DNS.
- **The 30-day Squarespace hold + calendar reminder** (MIG-10) is a real task: set a calendar event for T+30 to run `rg 'squarespace-cdn|static1.squarespace' .` across the app repo. Zero matches = safe to cancel. Don't cancel earlier.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/email/PurchaseConfirmation.tsx` — already has `kind: 'purchase' | 'migration'` discriminator. Phase 6 fills in real migration copy for the `migration` branch.
- `migration_tokens` table in Supabase — created in Phase 4. `token` (PK, opaque 32-byte hex), `email`, `expires_at`, `used_at`. Server-only access via service role.
- `app/set-password/` — Phase 4 flow handles both first-time password set and existing-user update. Migrated members use this same page. Phase 4 context notes the `/set-password/expired` self-service re-issue page also exists.
- `lib/supabase/admin.ts` → `getAdminClient()` — service-role client pattern for the import script and any server-side migration ops.
- `Nicole-Hansult-Coaching/supabase/migrations/002_paywall.sql` — `vibrant40_members` table already exists. Import script inserts into this table.
- `Nicole-Hansult-Coaching/scripts/smoke-test.sh` — existing smoke test script; Phase 6 extends or re-runs it post-cutover for MIG-11.

### Established Patterns
- **`hello@mail.nicolehansultcoaching.com` sender** — warm since 2026-05-26 (Phase 3). Migration blast uses this same sender. Do NOT introduce a new FROM address.
- **Resend `reply_to`** pattern established in Phase 3 for contact forms — migration email sets `reply_to` to Nicole's address so member replies land in her inbox.
- **Idempotent insert pattern** (stripe_events PK) — import script should similarly be idempotent: `INSERT INTO vibrant40_members ... ON CONFLICT (email) DO NOTHING` so re-running the script is safe.

### Integration Points
- **Squarespace Domains panel** — A/CNAME records live here. TTL pre-lowering and the cutover flip both happen in this panel.
- **Stripe Dashboard** — Live webhook endpoint URL must be updated from preview URL to apex domain post-flip. One manual step in the Stripe Dashboard UI.
- **Google Search Console** — Sitemap re-submission on cutover day (MIG-09). Requires GSC access to be set up on the current Squarespace site first (open TODO in STATE.md).
- **Vercel project domains** — Apex and `www` domains must be added/verified in Vercel Dashboard before the DNS flip. HTTPS provisioning is automatic once DNS resolves.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The zero-member reality means Phase 6 is lighter than originally specced, but all decisions are captured above.

</deferred>

---

*Phase: 06-member-migration-dns-cutover*
*Context gathered: 2026-05-27*
