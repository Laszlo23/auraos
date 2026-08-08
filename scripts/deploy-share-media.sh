#!/usr/bin/env bash
# Sync share-kit (+ landing) MP4s to the VPS. Videos stay gitignored (too large for git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@186.240.156.50}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_PUBLIC="${DEPLOY_PUBLIC:-/opt/auraos/public}"
# TanStack Start serves built assets from .output/public after `vite build`.
REMOTE_OUTPUT_PUBLIC="${DEPLOY_OUTPUT_PUBLIC:-/opt/auraos/.output/public}"

KIT_MP4S=(
  4am.mp4
  donotsleep.mp4
  hired.mp4
  makemoney.mp4
  makemoney2.mp4
  meanwhile.mp4
  aishouldwork.mp4
  aprove.mp4
  automateds.mp4
  auraos.mp4
  aura_os.mp4
  teaser.mp4
  teasernice.mp4
  aura-teaser.mp4
)

missing=0
for f in "${KIT_MP4S[@]}"; do
  if [[ ! -f "$ROOT/public/$f" ]]; then
    echo "MISSING local: public/$f" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  echo "Run or restore local public/*.mp4 first." >&2
  exit 1
fi

echo "==> rsync share-kit MP4s → $HOST:$REMOTE_PUBLIC and $REMOTE_OUTPUT_PUBLIC"
FILES=()
for f in "${KIT_MP4S[@]}"; do
  FILES+=("$ROOT/public/$f")
done
for DEST in "$REMOTE_PUBLIC" "$REMOTE_OUTPUT_PUBLIC"; do
  echo "→ $DEST"
  ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "$HOST" "mkdir -p $DEST/share"
  rsync -avz --progress \
    -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
    "${FILES[@]}" \
    "$HOST:$DEST/"
  # Posters for /share kit cards
  if [[ -d "$ROOT/public/share" ]]; then
    rsync -avz --progress \
      -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
      "$ROOT/public/share/" \
      "$HOST:$DEST/share/"
  fi
done

echo "==> verify remote (.output/public)"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "$HOST" \
  "cd $REMOTE_OUTPUT_PUBLIC && ls -lah ${KIT_MP4S[*]}"

echo "==> fix permissions for Caddy file_server"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "$HOST" \
  "chown -R root:caddy $REMOTE_PUBLIC && chmod -R u=rwX,g=rX,o=rX $REMOTE_PUBLIC && chmod a+r $REMOTE_OUTPUT_PUBLIC/*.mp4 2>/dev/null || true"

echo "Done."
