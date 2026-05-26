#!/usr/bin/env bash
# Phase 2 smoke tests — validates key routes and MKTG requirements.
# Requires a running Next.js server (pnpm dev or pnpm start).
# Usage: BASE_URL=http://localhost:3000 bash scripts/smoke-test.sh
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
PASS=0; FAIL=0

check() {
  local desc="$1"; local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  PASS: $desc"; PASS=$((PASS+1))
  else
    echo "  FAIL: $desc"; FAIL=$((FAIL+1))
  fi
}

echo "=== Phase 2 Smoke Tests against $BASE ==="
check "MKTG-02: /about returns 200"              "curl -sf -o /dev/null '$BASE/about'"
check "MKTG-03: /services returns 200"            "curl -sf -o /dev/null '$BASE/services'"
check "MKTG-09: /testimonials returns 200"        "curl -sf -o /dev/null '$BASE/testimonials'"
check "MKTG-10: /insights returns 200"            "curl -sf -o /dev/null '$BASE/insights'"
check "MKTG-11: /look-and-feel-good-naked 200"    "curl -sf -o /dev/null '$BASE/look-and-feel-good-naked'"
check "MKTG-12: /booking-appointment has Acuity"  "curl -sf '$BASE/booking-appointment' | grep -q 'acuityscheduling'"
check "MKTG-15: DisclaimerBand on home"           "curl -sf '$BASE' | grep -q 'medical-disclaimer'"
check "MKTG-16: og:image present on home"         "curl -sf '$BASE' | grep -q 'og:image'"
check "MKTG-17: JSON-LD on home"                  "curl -sf '$BASE' | grep -q 'application/ld+json'"
check "MKTG-18: /start-here -> 301/308"           "curl -sI '$BASE/start-here' | grep -q '30[18]'"
check "MKTG-18: /vibrant40-jumpstart-enroll -> 301" "curl -sI '$BASE/services/vibrant40-jumpstart-enroll' | grep -q '30[18]'"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "ALL PASS" && exit 0 || exit 1
