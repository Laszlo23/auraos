#!/usr/bin/env bash
# Shared helper: put the Node.js version pinned by .nvmrc (Node 24, per
# package.json "engines") ahead of any other node on PATH. Source this from the
# Cloud Agent install/dev scripts so every command runs on the expected runtime.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="$(cat "$REPO_ROOT/.nvmrc" 2>/dev/null || echo 24)"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install on demand (fast no-op when the version is already baked into the
# environment snapshot).
if ! nvm which "$NODE_VERSION" >/dev/null 2>&1; then
  nvm install "$NODE_VERSION" >/dev/null
fi

NODE_BIN_DIR="$(dirname "$(nvm which "$NODE_VERSION")")"
export PATH="$NODE_BIN_DIR:$PATH"
