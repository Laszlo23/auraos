#!/usr/bin/env bash
# Aura OS + OpenClaw VPS bootstrap (Ubuntu 24.04)
# Target: aibusiness.fun → this host
# Security model: Caddy public for Aura only; OpenClaw Gateway loopback + token (SSH tunnel for ops).
set -euo pipefail

DOMAIN="${DOMAIN:-aibusiness.fun}"
APP_USER="${APP_USER:-aura}"
APP_DIR="${APP_DIR:-/opt/auraos}"
REPO_URL="${REPO_URL:-https://github.com/Laszlo23/auraos.git}"
OPENCLAW_PORT="${OPENCLAW_PORT:-18789}"
NODE_MAJOR="${NODE_MAJOR:-22}"

if [[ $(id -u) -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl gnupg git ufw fail2ban unattended-upgrades \
  build-essential python3 jq

echo "==> Node ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Firewall (ssh + http/https only)"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban"
systemctl enable --now fail2ban

echo "==> Unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades || true

echo "==> App user"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

echo "==> Clone / update Aura OS"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --depth 1 origin main
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone --depth 1 -b main "$REPO_URL" "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

echo "==> Env file"
if [[ ! -f "$APP_DIR/.env" ]]; then
  if [[ -f /root/auraos.env ]]; then
    install -o "$APP_USER" -g "$APP_USER" -m 600 /root/auraos.env "$APP_DIR/.env"
  else
    echo "WARNING: place production secrets in /root/auraos.env then re-run, or create $APP_DIR/.env" >&2
    touch "$APP_DIR/.env"
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
  fi
fi

# Ensure SITE_URL points at this domain
if ! grep -q '^SITE_URL=' "$APP_DIR/.env" 2>/dev/null; then
  echo "SITE_URL=https://${DOMAIN}" >> "$APP_DIR/.env"
fi
if ! grep -q '^VITE_APP_ENV=' "$APP_DIR/.env" 2>/dev/null; then
  echo "VITE_APP_ENV=production" >> "$APP_DIR/.env"
fi
if ! grep -q '^NODE_ENV=' "$APP_DIR/.env" 2>/dev/null; then
  echo "NODE_ENV=production" >> "$APP_DIR/.env"
fi

echo "==> Install + build (Node server preset for VPS)"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm ci && NITRO_PRESET=node-server npm run build"

echo "==> Media (optional, large)"
if [[ "${FETCH_MEDIA:-0}" == "1" ]]; then
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && bash scripts/fetch-media.sh" || true
fi

echo "==> systemd: auraos"
cat >/etc/systemd/system/auraos.service <<EOF
[Unit]
Description=Aura OS (TanStack Start)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/.output/server/index.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now auraos

echo "==> Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

cat >/etc/caddy/Caddyfile <<EOF
${DOMAIN}, www.${DOMAIN} {
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
    -Server
  }
  @static path *.js *.css *.woff2 *.jpg *.jpeg *.png *.webp *.svg *.ico *.mp4
  header @static Cache-Control "public, max-age=604800, immutable"
  reverse_proxy 127.0.0.1:3000
}
EOF

systemctl enable --now caddy
systemctl reload caddy

echo "==> OpenClaw (loopback only — never public)"
npm install -g openclaw@latest
# Dedicated OS user for OpenClaw personal-assistant trust boundary
if ! id openclaw >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin openclaw
fi
sudo -u openclaw bash -lc 'mkdir -p ~/.openclaw && chmod 700 ~/.openclaw'

TOKEN_FILE=/root/openclaw-gateway.token
if [[ ! -f "$TOKEN_FILE" ]]; then
  openssl rand -hex 32 >"$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
fi
GW_TOKEN=$(cat "$TOKEN_FILE")

# Minimal hardened config (token auth, loopback, messaging tools only)
sudo -u openclaw tee /home/openclaw/.openclaw/openclaw.json >/dev/null <<JSON
{
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "port": ${OPENCLAW_PORT},
    "auth": { "mode": "token", "token": "${GW_TOKEN}" },
    "allowRealIpFallback": false
  },
  "session": { "dmScope": "per-channel-peer" },
  "tools": {
    "profile": "messaging",
    "deny": ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    "fs": { "workspaceOnly": true },
    "exec": { "security": "deny", "ask": "always" },
    "elevated": { "enabled": false }
  }
}
JSON
chmod 600 /home/openclaw/.openclaw/openclaw.json
chown openclaw:openclaw /home/openclaw/.openclaw/openclaw.json

cat >/etc/systemd/system/openclaw-gateway.service <<EOF
[Unit]
Description=OpenClaw Gateway (loopback)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Environment=HOME=/home/openclaw
Environment=OPENCLAW_GATEWAY_TOKEN=${GW_TOKEN}
WorkingDirectory=/home/openclaw
ExecStart=/usr/bin/openclaw gateway --port ${OPENCLAW_PORT}
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/openclaw

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now openclaw-gateway || true

echo "==> Security audit (OpenClaw)"
sudo -u openclaw bash -lc "openclaw security audit --fix" || true
sudo -u openclaw bash -lc "openclaw security audit" || true

echo
echo "================ DONE ================"
echo "Aura:    https://${DOMAIN}"
echo "OpenClaw Gateway: loopback :${OPENCLAW_PORT} (NOT public)"
echo "Gateway token: $TOKEN_FILE"
echo "SSH tunnel from laptop:"
echo "  ssh -N -L ${OPENCLAW_PORT}:127.0.0.1:${OPENCLAW_PORT} root@$(hostname -I | awk '{print \$1}')"
echo "Then: openclaw gateway status --url ws://127.0.0.1:${OPENCLAW_PORT} --token \$(cat $TOKEN_FILE)"
echo "Put production .env at /root/auraos.env and re-run if build/start failed for missing secrets."
echo "======================================"
