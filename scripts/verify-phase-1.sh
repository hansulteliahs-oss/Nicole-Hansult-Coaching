#!/usr/bin/env bash
# Phase 1 exit gate — composite verification.
#
# Runs locally pre-deploy, then re-run against the deployed Vercel URL.
# Usage:
#   ./scripts/verify-phase-1.sh                                    # local-only checks
#   DEPLOY_URL=https://your-app.vercel.app ./scripts/verify-phase-1.sh   # full check
#
# With DEV_PREVIEW_KEY also exported, the script verifies the gated
# /dev/components styleguide returns 200 with the correct key.

set -e

echo "── Build + lint + typecheck ──"
pnpm build
pnpm lint
pnpm tsc --noEmit

echo "── FOUND-05: zero Squarespace CDN refs in app source ──"
./scripts/verify-no-squarespace.sh

if [ -z "${DEPLOY_URL:-}" ]; then
  echo "── Skipping HTTP smoke (no DEPLOY_URL) ──"
  echo "PASS (local checks only). Re-run with DEPLOY_URL=... for full gate."
  exit 0
fi

echo "── HTTP smoke against $DEPLOY_URL ──"

# 1. Home renders
curl -sf -o /dev/null "$DEPLOY_URL/" || { echo "FAIL: / returns non-200"; exit 1; }

# 2. Sitemap is XML with <urlset>
curl -sf "$DEPLOY_URL/sitemap.xml" | grep -q "<urlset" || { echo "FAIL: sitemap.xml missing <urlset>"; exit 1; }

# 3. robots.txt disallows /dev/
curl -sf "$DEPLOY_URL/robots.txt" | grep -q "Disallow: /dev" || { echo "FAIL: robots.txt missing Disallow: /dev"; exit 1; }

# 4. Favicon resolves at /icon (Next 16 serves it there when app/icon.tsx exists)
curl -sf -o /dev/null "$DEPLOY_URL/icon" || { echo "FAIL: /icon missing (expected from app/icon.tsx)"; exit 1; }

# 5. /dev/components without key → 404
code=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/dev/components")
if [ "$code" != "404" ]; then echo "FAIL: /dev/components without key returns $code (expected 404)"; exit 1; fi

# 6. /dev/components with wrong key → 404
code=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/dev/components?key=wrong")
if [ "$code" != "404" ]; then echo "FAIL: /dev/components with wrong key returns $code (expected 404)"; exit 1; fi

# 7. /dev/components with right key → 200 (if DEV_PREVIEW_KEY set in env)
if [ -n "${DEV_PREVIEW_KEY:-}" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/dev/components?key=$DEV_PREVIEW_KEY")
  if [ "$code" != "200" ]; then echo "FAIL: /dev/components with right key returns $code (expected 200)"; exit 1; fi
else
  echo "  (skipped 200-with-key check — DEV_PREVIEW_KEY not in shell env)"
fi

echo ""
echo "PASS: Phase 1 exit gate green."
