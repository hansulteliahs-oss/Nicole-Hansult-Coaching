#!/usr/bin/env bash
# AUTH-08 grep gate — Phase 4 compliance check.
#
# Asserts zero `getSession` references in app/ + lib/ source (excluding tests
# and node_modules). Phase 4 canon: never trust `getSession()` because it
# reads the unverified cookie helper; always use `getClaims()` which verifies
# the signed JWT.
#
# Comments must NOT contain the literal substring `getSession` either — use
# wording like "unverified cookie helper" or "signed JWT claims" so the gate
# stays honest.
#
# Usage:  bash scripts/verify-auth-08.sh
# Exit:   0 = pass (zero refs), 1 = fail (refs found and printed).
set -euo pipefail

HITS=$(grep -rn "getSession" app lib \
  --include="*.ts" \
  --include="*.tsx" \
  2>/dev/null \
  | grep -v node_modules \
  | grep -v ".test." \
  || true)

if [ -z "$HITS" ]; then
  echo "AUTH-08 PASS: zero getSession references in app/ + lib/"
  exit 0
fi

echo "AUTH-08 FAIL: getSession references found:"
echo "$HITS"
exit 1
