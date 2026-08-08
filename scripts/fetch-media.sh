#!/usr/bin/env bash
# Mirror production media from https://aibusiness.fun into ./public
# (large MP4s are gitignored — run this after clone / before local demo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public"
BASE="${MEDIA_BASE_URL:-https://aibusiness.fun}"
mkdir -p "$OUT"

fetch() {
  local path="$1" dest="$2"
  echo "→ $dest"
  curl -fsSL --compressed --max-time 180 -A 'AuraOS-fetch-media/1.0' \
    -o "$OUT/$dest" "$BASE$path"
}

fetch "/__l5e/assets-v1/f4b1d5db-475e-4c5d-955e-df8cdfded35d/aura-hero.mp4" "aura-hero.mp4"
fetch "/__l5e/assets-v1/20cad139-c9a6-46de-aeec-2a81e70409bf/aura-teaser.mp4" "aura-teaser.mp4"
fetch "/__l5e/assets-v1/ac2fbb8a-e9de-48d8-8ddd-6f71e637654f/aura-teaser-poster.jpg" "aura-teaser-poster.jpg"
fetch "/__l5e/assets-v1/a15483c0-4628-4df9-a64f-f29c454b132b/act-agents.mp4" "act-agents.mp4"
fetch "/__l5e/assets-v1/c0e5fb68-4410-4336-9444-771b8abc20e5/act-quant.mp4" "act-quant.mp4"
fetch "/__l5e/assets-v1/af21310c-c7fe-492b-a4b9-29ecc8088213/act-rewards.mp4" "act-rewards.mp4"

echo "Done. Media in $OUT"
ls -lh "$OUT"/*.{mp4,jpg} 2>/dev/null || true
