#!/usr/bin/env bash
# Phase 1 exit gate: zero Squarespace CDN references in the app source tree.
# Exits 1 (FAIL) if any 'squarespace-cdn' or 'static1.squarespace' references
# remain in shipped app code.
#
# Excludes:
#   - lib/images/map.json + migration-report.json (intentional — the migration map records source URLs)
#   - scripts/verify-no-squarespace.sh (this script literally greps for the string)
#   - scripts/migrate-images.ts (the migration tool's regex must reference the CDN domain)
#   - docs/** (content-audit + planning docs are not app source)
#   - node_modules + .next build artifacts
set -e
PATTERN='squarespace-cdn|static1\.squarespace'

if rg -q \
     --glob '!lib/images/map.json' \
     --glob '!lib/images/migration-report.json' \
     --glob '!scripts/verify-no-squarespace.sh' \
     --glob '!scripts/migrate-images.ts' \
     --glob '!docs/**' \
     --glob '!node_modules/**' \
     --glob '!.next/**' \
     "$PATTERN" .; then
  echo "FAIL: Squarespace CDN references found in app source. Run pnpm migrate:images then re-check."
  rg \
    --glob '!lib/images/map.json' \
    --glob '!lib/images/migration-report.json' \
    --glob '!scripts/verify-no-squarespace.sh' \
    --glob '!scripts/migrate-images.ts' \
    --glob '!docs/**' \
    --glob '!node_modules/**' \
    --glob '!.next/**' \
    "$PATTERN" . || true
  exit 1
fi
echo "PASS: zero Squarespace CDN references in app source."
