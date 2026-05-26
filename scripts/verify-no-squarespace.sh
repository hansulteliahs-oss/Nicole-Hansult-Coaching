#!/usr/bin/env bash
# Phase 1 exit gate: zero Squarespace CDN references in the app source tree.
# Exits 1 (FAIL) if any 'squarespace-cdn' or 'static1.squarespace' references
# remain in shipped app code.
#
# Uses POSIX `grep -rE` so this script works in any CI / pnpm-spawned shell
# (does NOT depend on ripgrep being installed).
#
# Excludes:
#   - lib/images/map.json + migration-report.json (intentional — the migration map records source URLs)
#   - lib/images/keys.ts (intentional — single source of truth for raw image URLs that components reference)
#   - lib/content/testimonials.ts (intentional — holds Squarespace video source URLs pending Mux migration in Phase 2)
#   - scripts/verify-no-squarespace.sh (this script literally greps for the string)
#   - scripts/migrate-images.ts (the migration tool's regex must reference the CDN domain)
#   - docs/** (content-audit + planning docs are not app source)
#   - node_modules + .next build artifacts
set -euo pipefail
PATTERN='squarespace-cdn|static1\.squarespace'

# Build the matches list using grep -rE with exclude flags, swallowing rc=1 (no matches)
# so `set -e` doesn't kill us on the happy path.
MATCHES=$(grep -rE \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  --exclude-dir=docs \
  --exclude='map.json' \
  --exclude='migration-report.json' \
  --exclude='keys.ts' \
  --exclude='testimonials.ts' \
  --exclude='verify-no-squarespace.sh' \
  --exclude='migrate-images.ts' \
  "$PATTERN" . 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "FAIL: Squarespace CDN references found in app source. Run pnpm migrate:images then re-check."
  echo "$MATCHES"
  exit 1
fi
echo "PASS: zero Squarespace CDN references in app source."
