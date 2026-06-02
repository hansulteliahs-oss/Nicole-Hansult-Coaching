#!/usr/bin/env bash
# verify-redirects.sh — Post-cutover redirect verification (MIG-09)
#
# Run against the LIVE production apex AFTER the DNS flip (MIG-09).
# Before flip, can smoke against the Vercel preview URL to catch config
# regressions:
#   bash scripts/verify-redirects.sh https://nicole-hansult-coaching.vercel.app
#
# Usage: bash scripts/verify-redirects.sh [base-url]
#   Default base: https://nicolehansultcoaching.com (or $BASE_URL env var)
#
# Exit code 0 = all redirects correct
# Exit code 1 = one or more redirects failed
#
# To extend: add rows to REDIRECTS as "OLD_PATH EXPECTED_DESTINATION".
# Run: node scripts/crawl-redirects.mjs to surface additional old paths.
set -euo pipefail

BASE="${1:-${BASE_URL:-https://nicolehansultcoaching.com}}"
FAIL=0
PASS=0

# Array of "OLD_PATH EXPECTED_DESTINATION" pairs
# Seeded from next.config.ts redirects() — these are the hardcoded floor.
# Add more rows below as crawl-redirects.mjs surfaces additional old paths.
REDIRECTS=(
  "/start-here /services"
  "/services/vibrant40-jumpstart-enroll /services"
  "/vibrant40-jumpstart /services/vibrant40-jumpstart"
  "/services/clinical-longevity-evaluation /services"
  "/cart /"
)

printf "%-45s %-35s %-6s %s\n" "OLD PATH" "EXPECTED DEST" "STATUS" "RESULT"
printf "%-45s %-35s %-6s %s\n" "--------" "-------------" "------" "------"

check_redirect() {
  local old_path="$1"
  local expected_dest="$2"
  local url="${BASE}${old_path}"

  # Fetch headers: capture HTTP status and Location header
  local response
  response=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$url" 2>/dev/null)

  local status
  status=$(echo "$response" | awk '{print $1}')

  local redirect_url
  redirect_url=$(echo "$response" | awk '{print $2}')

  # Status must be 301 or 308
  if [[ "$status" != "301" && "$status" != "308" ]]; then
    printf "%-45s %-35s %-6s %s\n" "${old_path}" "${expected_dest}" "${status}" "FAIL (expected 301/308)"
    FAIL=$((FAIL + 1))
    return
  fi

  # redirect_url path must end with (or equal) expected_dest
  # Strip scheme+host to get path, remove trailing slash for comparison
  local redirect_path
  redirect_path=$(echo "$redirect_url" | sed 's|^https://[^/]*||' | sed 's|^http://[^/]*||' | sed 's|/$||')
  local expected_clean
  expected_clean=$(echo "$expected_dest" | sed 's|/$||')

  if [[ "$redirect_path" == "$expected_clean" || "$redirect_path" == "${expected_clean}/" ]]; then
    printf "%-45s %-35s %-6s %s\n" "${old_path}" "${expected_dest}" "${status}" "PASS"
    PASS=$((PASS + 1))
  else
    printf "%-45s %-35s %-6s %s\n" "${old_path}" "${expected_dest}" "${status}" "FAIL (got: ${redirect_path})"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Redirect Verification against ${BASE} ==="
echo ""

for entry in "${REDIRECTS[@]}"; do
  old_path=$(echo "$entry" | awk '{print $1}')
  expected_dest=$(echo "$entry" | awk '{print $2}')
  check_redirect "$old_path" "$expected_dest"
done

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS — all redirects are correct."
  exit 0
else
  echo "FAIL — ${FAIL} redirect(s) did not match expected destination."
  exit 1
fi
