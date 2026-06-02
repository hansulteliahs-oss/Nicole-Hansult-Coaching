#!/usr/bin/env bash
# check-dns-ttl.sh — DNS TTL pre-cutover gate (MIG-06)
#
# Run >=48h before the cutover to confirm the TTL pre-lower (MIG-06).
# Re-run from a phone hotspot / different network for the 3rd independent
# vantage point if a resolver caches.
#
# Usage: bash scripts/check-dns-ttl.sh [domain]
#   Default domain: nicolehansultcoaching.com
#
# Exit code 0 = all TTLs <=300 (green light for cutover window)
# Exit code 1 = one or more TTLs >300, or a query returned no answer
set -euo pipefail

DOMAIN="${1:-nicolehansultcoaching.com}"
RESOLVERS=(8.8.8.8 1.1.1.1 9.9.9.9)
TTL_MAX=300
FAIL=0

printf "%-12s %-35s %-6s %-8s %s\n" "RESOLVER" "NAME" "TYPE" "TTL" "STATUS"
printf "%-12s %-35s %-6s %-8s %s\n" "--------" "----" "----" "---" "------"

check_ttl() {
  local resolver="$1"
  local name="$2"
  local rtype="$3"

  local answer
  answer=$(dig +noall +answer "@${resolver}" "${name}" "${rtype}" 2>/dev/null)

  if [ -z "$answer" ]; then
    printf "%-12s %-35s %-6s %-8s %s\n" "${resolver}" "${name}" "${rtype}" "N/A" "FAIL (no answer)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Extract TTL from field 2 of the first answer line
  local ttl
  ttl=$(echo "$answer" | awk 'NR==1 {print $2}')

  if [ -z "$ttl" ] || ! [[ "$ttl" =~ ^[0-9]+$ ]]; then
    printf "%-12s %-35s %-6s %-8s %s\n" "${resolver}" "${name}" "${rtype}" "${ttl:-?}" "FAIL (parse error)"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$ttl" -le "$TTL_MAX" ]; then
    printf "%-12s %-35s %-6s %-8s %s\n" "${resolver}" "${name}" "${rtype}" "${ttl}" "PASS"
  else
    printf "%-12s %-35s %-6s %-8s %s\n" "${resolver}" "${name}" "${rtype}" "${ttl}" "FAIL (>${TTL_MAX}s)"
    FAIL=$((FAIL + 1))
  fi
}

for resolver in "${RESOLVERS[@]}"; do
  check_ttl "${resolver}" "${DOMAIN}"       "A"
  check_ttl "${resolver}" "www.${DOMAIN}"   "CNAME"
done

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS — all TTLs are <=${TTL_MAX}s. DNS is ready for the cutover window."
  exit 0
else
  echo "FAIL — ${FAIL} check(s) failed. Pre-lower the TTL in Squarespace Domains panel and re-run."
  exit 1
fi
