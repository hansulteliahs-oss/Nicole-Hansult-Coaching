# Nicole Hansult Coaching — Site Rebuild

Next.js + Vercel rebuild of [nicolehansultcoaching.com](https://nicolehansultcoaching.com), currently on Squarespace.

## Status

🚧 **In planning.** No code shipped yet.

## Phase 1 — Content audit

Live site has been fully crawled. The verbatim content inventory lives at [`docs/CONTENT-AUDIT.md`](./docs/CONTENT-AUDIT.md) on the `docs/content-audit` branch (PR pending).

## What comes next

1. Resolve 7 open questions listed at the top of `docs/CONTENT-AUDIT.md` (Nicole confirmation needed)
2. Import design spec (`design.md`) from claude design
3. Scaffold Next.js 15 + Tailwind, build pages from audit + design
4. Re-host Squarespace CDN images locally
5. Wire Resend-backed contact forms + Acuity embed
6. DNS cutover from Squarespace → Vercel

## Related plans

- Build plan: `~/.claude/plans/hey-claude-tranquil-raven.md`
- Audit plan: `~/.claude/plans/hey-claude-i-am-federated-pixel.md`
