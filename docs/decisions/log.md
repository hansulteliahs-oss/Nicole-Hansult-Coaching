# Decisions Log — Nicole Hansult Coaching Rebuild

One row per durable call. Keep them small, dated, and with a one-line "why" so future-Eliahs (or future-Claude) can tell whether the call still holds.

| Date | Decision | Why | Source |
|---|---|---|---|
| 2026-05-25 | Offer ladder is **5 tiers**, not 3. Add 3-Month Coaching Program ($5,500) and Everyday Training ($165/hr) to the rebuild. Update CLE price from $255 → $299.99. Update Vibrant40 duration from "8 days" → "8 weeks". | Live Squarespace site is stale on two fields and silent on the two top-tier offers. Rebuild is the chance to surface the full ladder. | `Answers.md` (Nicole, source of truth) |
| 2026-05-25 | **Move Vibrant40 OFF Squarespace.** Self-host on the new Next.js site so the Squarespace subscription can be cancelled entirely after rebuild. | The whole point of the rebuild is owned infrastructure. Bouncing members to a Squarespace-branded portal undercuts that, and the Squarespace bill (~$300–800/yr) exists only to gate one $88 course. | This session |
| 2026-05-25 | **Vibrant40 stack:** Supabase (Auth + Postgres) + Stripe (one-time $88) + Mux (video) + custom auth UI + all-unlocked on day 1 (no drip). Member migration via CSV export from Squarespace → one-time "set your password" email via Resend. | Mux: best player, cost trivial at this scale. Custom UI: rebuild is a brand showcase. No drip: simpler build, members get full access immediately. Self-hosting doubles as a Handled portfolio piece for the AI Build & Operations offer. | This session |
| 2026-05-25 | **Canonical city: Carlsbad, CA.** Scrub Encinitas references out of testimonial labels and copy during rebuild; standardize on Carlsbad. "North County San Diego" stays where it appears as regional framing. | Matches current footer, most image alt-tags, and the CLE "in-person only in Carlsbad, CA" line. Less ambiguity for local SEO. | This session |
| 2026-05-25 | **Remove `/start-here` from nav** (primary + footer). | Page 404s on live site; `/services` already serves the "where do I start" job via the "Not Sure Where to Start?" section. One less page to maintain. | This session |
| 2026-05-25 | **Contact form + lead-magnet form both send to `nicole@nicolehansultcoaching.com`**. Wire via Resend API route in Next.js. | Status quo; Privacy + Terms already reference this address. No new mailbox to set up. | This session |
| 2026-05-28 | **CLE price $299.99 → $295.** Supersedes the 2026-05-25 row above. | Rounder, easier to say, $4.99 of friction not worth the cents. CLE is booked (not Stripe checkout) so no price-object to sync. | Nicole, this session |

## Open items (info/files to gather — not decisions)

- Video files / source URLs: 4 client testimonial videos (Bianca, John M., Greg R., Vanessa) + "Meet Nicole" About video — pull from Squarespace admin or ask Nicole
- Lead magnet PDF for `/look-and-feel-good-naked` — get from Nicole
- Vibrant40 active member count — pull from Squarespace admin (Members → Vibrant40)
- CSV export of Vibrant40 members (name + email at minimum) — pull from Squarespace admin closer to migration date
