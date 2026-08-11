#!/usr/bin/env bash
# Re-encode public/*.mp4 for web (H.264 + faststart). Requires ffmpeg.
# Usage: bash scripts/optimize-media.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${MEDIA_SRC:-/tmp/aura-media-backup}"
OUT="${MEDIA_OUT:-/tmp/aura-media-out}"
mkdir -p "$OUT"

encode_bg() {
  local in="$1" out="$2" maxw="${3:-1280}" crf="${4:-30}"
  ffmpeg -y -hide_banner -loglevel error -i "$in" \
    -vf "scale='min(${maxw},iw)':-2:flags=lanczos,fps=24" \
    -c:v libx264 -preset slow -crf "$crf" -profile:v high -pix_fmt yuv420p \
    -movflags +faststart -an "$out"
}

encode_share() {
  local in="$1" out="$2" maxw="${3:-720}" crf="${4:-27}"
  local has_a
  has_a="$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$in" | head -1 || true)"
  if [[ -n "$has_a" ]]; then
    ffmpeg -y -hide_banner -loglevel error -i "$in" \
      -vf "scale='min(${maxw},iw)':-2:flags=lanczos,fps=24" \
      -c:v libx264 -preset slow -crf "$crf" -profile:v high -pix_fmt yuv420p \
      -c:a aac -b:a 96k -ac 2 -ar 44100 -movflags +faststart "$out"
  else
    encode_bg "$in" "$out" "$maxw" "$crf"
  fi
}

if [[ ! -d "$SRC" ]]; then
  echo "Copy originals to $SRC first (or set MEDIA_SRC)."
  exit 1
fi

encode_bg "$SRC/aura-hero.mp4" "$OUT/aura-hero.mp4" 1280 32
encode_share "$SRC/aura-teaser.mp4" "$OUT/aura-teaser.mp4" 720 30
for f in act-agents act-quant act-rewards; do
  encode_bg "$SRC/$f.mp4" "$OUT/$f.mp4" 1280 30
done
for f in teasernice teaser donotsleep aishouldwork auraos aprove makemoney hired automateds 4am aura_os makemoney2 meanwhile; do
  [[ -f "$SRC/$f.mp4" ]] || continue
  w=720; c=27
  [[ "$f" == "teasernice" ]] && w=640 && c=30
  encode_share "$SRC/$f.mp4" "$OUT/$f.mp4" "$w" "$c"
done

echo "Wrote $OUT — review sizes then: cp $OUT/*.mp4 $ROOT/public/"
ls -lhS "$OUT"
