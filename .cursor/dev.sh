#!/usr/bin/env bash
# Cloud Agent dev terminal: run the Vite dev server (binds 0.0.0.0:8080).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/node-env.sh"

cd "$SCRIPT_DIR/.."

exec npm run dev
