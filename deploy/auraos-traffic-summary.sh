#!/usr/bin/env bash
# Roll Caddy JSON access logs into a short summary the Desk traffic tab can read.
set -euo pipefail

OUT="${CADDY_TRAFFIC_SUMMARY:-/opt/auraos/var/caddy-traffic.json}"
LOG="${CADDY_ACCESS_LOG:-/var/lib/caddy/logs/aibusiness.access.log}"
REVIEW_LOG="${CADDY_REVIEW_ACCESS_LOG:-/var/lib/caddy/logs/review.access.log}"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/caddy-traffic-summary.mjs"

mkdir -p "$(dirname "$OUT")"
if [[ ! -f "$SCRIPT" ]]; then
  SCRIPT=/opt/auraos/deploy/caddy-traffic-summary.mjs
fi

node "$SCRIPT" --log "$LOG" --review-log "$REVIEW_LOG" --out "$OUT"
chmod 644 "$OUT" 2>/dev/null || true
