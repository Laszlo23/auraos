#!/usr/bin/env bash
# Print local Supabase connection info in .env-friendly form.
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase status -o env
echo ""
echo "# Studio: http://127.0.0.1:54323"
echo "# Copy API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env.local if they differ."
