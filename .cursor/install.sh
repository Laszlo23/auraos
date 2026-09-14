#!/usr/bin/env bash
# Cloud Agent install phase: refresh dependencies against package-lock.json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/node-env.sh"

cd "$SCRIPT_DIR/.."

echo "Using Node $(node -v) / npm $(npm -v)"
npm ci
