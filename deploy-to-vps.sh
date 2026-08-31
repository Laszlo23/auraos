#!/bin/bash
# Deploy to VPS - Run from your local machine
set -e
echo "🚀 Deploying to 186.240.156.50..."
ssh root@186.240.156.50 'cd /opt/auraos && git fetch origin main && git reset --hard origin/main && npm install --include=dev && npm run build && systemctl restart auraos && sleep 3 && systemctl is-active auraos'
echo "✅ Deployed! Check https://aibusiness.fun"
