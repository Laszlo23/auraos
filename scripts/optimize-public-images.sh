#!/usr/bin/env bash
# Recompress public JPEGs before VPS sync. Videos stay out of git.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="${OG_SRC:-$HOME/.cursor/projects/Users-poker-vibe-auraos/assets}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

jpeg_og() {
  local src="$1" dest="$2"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630" \
    -q:v 4 -frames:v 1 "$dest"
}

jpeg_max() {
  local src="$1" dest="$2" maxw="$3"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "scale='min(${maxw},iw)':-1" \
    -q:v 5 -frames:v 1 "$dest"
}

echo "==> campaign OG → public/og (1200×630)"
mkdir -p "$ROOT/public/og"
for name in home wien share story access nachbar review token lokal team; do
  src="$ASSETS/og-${name}.jpg"
  if [[ ! -f "$src" ]]; then
    echo "MISSING $src" >&2
    exit 1
  fi
  jpeg_og "$src" "$TMP/${name}.jpg"
  mv "$TMP/${name}.jpg" "$ROOT/public/og/${name}.jpg"
  echo "  og/${name}.jpg $(du -h "$ROOT/public/og/${name}.jpg" | awk '{print $1}')"
done
cp "$ROOT/public/og/home.jpg" "$ROOT/public/og-image.jpg"

echo "==> share posters (max 1080w)"
for f in "$ROOT"/public/share/*.jpg; do
  [[ -f "$f" ]] || continue
  jpeg_max "$f" "$TMP/$(basename "$f")" 1080
  mv "$TMP/$(basename "$f")" "$f"
done

echo "==> funnel heroes (max 1600w)"
if compgen -G "$ROOT/public/funnels/*.jpg" > /dev/null; then
  for f in "$ROOT"/public/funnels/*.jpg; do
    jpeg_max "$f" "$TMP/$(basename "$f")" 1600
    mv "$TMP/$(basename "$f")" "$f"
  done
fi

if [[ -f "$ROOT/public/aura-teaser-poster.jpg" ]]; then
  jpeg_max "$ROOT/public/aura-teaser-poster.jpg" "$TMP/aura-teaser-poster.jpg" 1600
  mv "$TMP/aura-teaser-poster.jpg" "$ROOT/public/aura-teaser-poster.jpg"
fi

echo "==> done"
ls -lah "$ROOT/public/og" "$ROOT/public/og-image.jpg"
