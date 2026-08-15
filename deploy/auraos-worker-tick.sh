#!/usr/bin/env bash
# Cron/systemd worker tick. Tries loopback first, then the public URL.
set -euo pipefail
ENV_FILE=/opt/auraos/.env
if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing $ENV_FILE" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
if [[ -z "${WORKER_SECRET:-}" ]]; then
  echo "WORKER_SECRET unset" >&2
  exit 1
fi

tick() {
  local url=$1
  local out code
  out=$(mktemp)
  code=$(curl -sS -m 120 -X POST -H "Authorization: Bearer ${WORKER_SECRET}" \
    "$url" -o "$out" -w "%{http_code}" || true)
  if [[ "$code" == "200" ]]; then
    rm -f "$out"
    return 0
  fi
  echo "tick HTTP ${code:-000} via $url" >&2
  head -c 240 "$out" >&2 || true
  echo >&2
  rm -f "$out"
  return 1
}

LOCAL_URL="${WORKER_TICK_URL:-http://127.0.0.1:3000/api/workers/tick}"
PUBLIC_URL="https://aibusiness.fun/api/workers/tick"
if tick "$LOCAL_URL"; then
  exit 0
fi
tick "$PUBLIC_URL"
