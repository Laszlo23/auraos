#!/usr/bin/env bash
# Deploy app code to VPS, rebuild, restart. Keeps Caddy able to serve public/*.mp4.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-root@186.240.156.50}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH=(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20)

echo "==> rsync → $HOST:/opt/auraos"
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .output --exclude .vinxi \
  --exclude .env --exclude .env.local --exclude .cache --exclude coverage \
  --exclude supabase/.temp --exclude 'public/*.mp4' --exclude yarn.lock \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
  "$ROOT/" "$HOST:/opt/auraos/"

# MP4s are gitignored (large binaries) but must stay in sync for LCP/share kit.
if compgen -G "$ROOT/public/*.mp4" > /dev/null; then
  echo "==> rsync public/*.mp4 (lean encodes)"
  rsync -az \
    -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes" \
    "$ROOT"/public/*.mp4 "$HOST:/opt/auraos/public/"
fi

echo "==> build + restart + fix media perms"
"${SSH[@]}" "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
chown -R aura:aura /opt/auraos
# Caddy (www) must traverse the app root to file_server /opt/auraos/public/*.mp4
chmod 755 /opt/auraos /opt/auraos/public
chmod -R a+rX /opt/auraos/public
chown aura:aura /opt/auraos/.env
chmod 600 /opt/auraos/.env

if [[ -f /opt/auraos/deploy/Caddyfile ]]; then
  cp /opt/auraos/deploy/Caddyfile /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile
  systemctl reload caddy
fi

sudo -u aura bash -lc '
set -euo pipefail
cd /opt/auraos
# Stale root server.ts shadows src/server.ts and breaks serverFns (ETH/trading).
rm -f ./server.ts ./server.js ./server.mjs
npm install --include=dev
set -a; . ./.env; set +a
export NITRO_PRESET=node-server
# .env must never force a development JSX runtime into the Nitro build.
export NODE_ENV=production
npm run build
'
# Build overwrites .output/public — re-copy media + decks from public if present
if compgen -G "/opt/auraos/public/*.mp4" >/dev/null; then
  cp -an /opt/auraos/public/*.mp4 /opt/auraos/.output/public/ 2>/dev/null || true
  if [[ -d /opt/auraos/public/share ]]; then
    mkdir -p /opt/auraos/.output/public/share
    cp -an /opt/auraos/public/share/. /opt/auraos/.output/public/share/ 2>/dev/null || true
  fi
fi
if compgen -G "/opt/auraos/public/*.pptx" >/dev/null; then
  cp -an /opt/auraos/public/*.pptx /opt/auraos/.output/public/ 2>/dev/null || true
fi

if [[ -f /opt/auraos/deploy/auraos-worker-tick.sh ]]; then
  install -m 0755 /opt/auraos/deploy/auraos-worker-tick.sh /usr/local/bin/auraos-worker-tick
fi
if ! crontab -l 2>/dev/null | grep -q auraos-worker-tick; then
  (crontab -l 2>/dev/null; echo '*/10 * * * * /usr/local/bin/auraos-worker-tick >>/var/log/auraos-worker-tick.log 2>&1') | crontab -
fi
if [[ -f /opt/auraos/deploy/auraos.service ]]; then
  install -m 0644 /opt/auraos/deploy/auraos.service /etc/systemd/system/auraos.service
  systemctl daemon-reload
fi

systemctl restart auraos
sleep 2
systemctl is-active auraos
curl -sS -o /dev/null -w "home:%{http_code} hero:%{http_code}\n" --max-time 20 https://aibusiness.fun/
curl -sS -o /dev/null -w "hero-mp4:%{http_code}\n" --max-time 20 https://aibusiness.fun/aura-hero.mp4
REMOTE

echo "Done."
