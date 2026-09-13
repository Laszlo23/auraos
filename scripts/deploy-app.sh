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
  --exclude auraos-landing-pr \
  --exclude .aura-t0-treasury.json --exclude .aura-t0-out.json \
  --exclude .aura-t0-predicted.json --exclude .aura-second-buy.json \
  --exclude '.aura-*.json' \
  --exclude 'contracts/aura/Aura.*.json' \
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
  if [[ -d /opt/auraos/deploy/sites ]]; then
    mkdir -p /etc/caddy/sites
    cp -a /opt/auraos/deploy/sites/. /etc/caddy/sites/
  fi
  if ! grep -qF "import /etc/caddy/sites" /etc/caddy/Caddyfile; then
    printf "\n# Aura Lokal — do not remove. OS deploys overwrite this file.\nimport /etc/caddy/sites/*\n" >> /etc/caddy/Caddyfile
  fi
  chmod 644 /etc/caddy/Caddyfile
  install -d -o caddy -g caddy -m 0750 /var/lib/caddy/logs
  for f in aibusiness.access.log review.access.log; do
    if [[ ! -f "/var/lib/caddy/logs/$f" ]]; then
      install -o caddy -g caddy -m 0640 /dev/null "/var/lib/caddy/logs/$f"
    else
      chown caddy:caddy "/var/lib/caddy/logs/$f"
      chmod 0640 "/var/lib/caddy/logs/$f"
    fi
  done
  caddy validate --config /etc/caddy/Caddyfile
  # Direct reload — systemctl reload runs a hook that cannot write this file.
  caddy reload --config /etc/caddy/Caddyfile --force
fi

sudo -u aura bash -lc '
set -euo pipefail
cd /opt/auraos
# Stale root server.ts shadows src/server.ts and breaks serverFns (ETH/trading).
rm -f ./server.ts ./server.js ./server.mjs
npm install --include=dev
set -a; . ./.env; set +a
# T-0 CA safety — never bake a predicted CREATE address into the public bundle.
if [[ -n "${AURA_T0_KEY:-}" ]]; then
  echo "REFUSING: AURA_T0_KEY must never be on the VPS"
  exit 1
fi
if [[ "${AURA_ALLOW_PRE_T0_CA:-}" == "1" || "${VITE_AURA_ALLOW_PRE_T0_CA:-}" == "1" ]]; then
  echo "REFUSING: AURA_ALLOW_PRE_T0_CA must never be set on the VPS"
  exit 1
fi
T0_EPOCH=$(date -u -d "2026-09-13 09:11:00" +%s)
NOW_EPOCH=$(date -u +%s)
if (( NOW_EPOCH < T0_EPOCH )); then
  if [[ "${AURA_CA_PUBLISH:-}" == "1" || "${VITE_AURA_CA_PUBLISH:-}" == "1" ]]; then
    echo "REFUSING: AURA_CA_PUBLISH is set before T-0 — would publish a predicted CA"
    exit 1
  fi
fi
if [[ "${AURA_CA_PUBLISH:-}" != "1" && "${VITE_AURA_CA_PUBLISH:-}" != "1" ]]; then
  unset AURA_TOKEN_CA VITE_AURA_TOKEN_CA AURA_PAIR_CA VITE_AURA_PAIR_CA \
    AURA_POOL_USDC VITE_AURA_POOL_USDC AURA_POOL_WETH VITE_AURA_POOL_WETH \
    AURA_GAUGE VITE_AURA_GAUGE AURA_BURN_SINK VITE_AURA_BURN_SINK \
    AURA_PAURA_REDEEM VITE_AURA_PAURA_REDEEM AURA_LP_SINK VITE_AURA_LP_SINK \
    AURA_PROTOCOL_SINK VITE_AURA_PROTOCOL_SINK AURA_QUEST_BONUS VITE_AURA_QUEST_BONUS
fi
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
if [[ -d /opt/auraos/public/docs ]]; then
  mkdir -p /opt/auraos/.output/public/docs
  cp -a /opt/auraos/public/docs/. /opt/auraos/.output/public/docs/
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
if [[ -f /opt/auraos/deploy/auraos-traffic-summary.sh ]]; then
  install -m 0755 /opt/auraos/deploy/auraos-traffic-summary.sh /usr/local/bin/auraos-traffic-summary
  mkdir -p /opt/auraos/var
  chmod 755 /opt/auraos/var
  /usr/local/bin/auraos-traffic-summary || true
fi
if ! crontab -l 2>/dev/null | grep -q auraos-traffic-summary; then
  (crontab -l 2>/dev/null; echo '*/15 * * * * /usr/local/bin/auraos-traffic-summary >/dev/null 2>&1') | crontab -
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
