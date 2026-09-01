#!/usr/bin/env bash
# Cloud Agent dev terminal: run the Vite/TanStack Start dev server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/node-env.sh"

cd "$SCRIPT_DIR/.."

# The Supabase client hard-requires config to instantiate. Real credentials
# (Cloud Agent secrets, a committed .env, or a local `supabase start`) always win
# because Vite gives already-present VITE_* environment variables the highest
# priority. When none are configured, fall back to a local placeholder so the UI
# still renders for frontend work (data/auth calls will fail until real
# credentials are supplied).
if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  export VITE_SUPABASE_URL="http://127.0.0.1:54321"
  export VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
  export VITE_SUPABASE_PROJECT_ID="local"
  echo "[dev] No VITE_SUPABASE_URL configured — using a local placeholder so the UI renders."
  echo "[dev] Add real Supabase credentials (Cloud secrets, .env, or 'supabase start') for live data/auth."
fi

exec npm run dev
