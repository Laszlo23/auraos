#!/usr/bin/env bash
# Cutover checklist: run when aibusiness.fun moves off Lovable onto your cloud.
# This script does NOT create a Supabase project — it prints the exact steps.
set -euo pipefail

cat <<'EOF'
Aura OS — Supabase cutover checklist
====================================

1) Create ONE Supabase project under YOUR org (Free is enough to start).
   https://supabase.com/dashboard

2) Login + link from this repo:
   npx supabase login
   npx supabase link --project-ref <YOUR_PROJECT_REF>

3) Push every migration (you own this project — unlike Lovable):
   npx supabase db push

4) Production env on your server (replace placeholders):
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   SITE_URL=https://aibusiness.fun
   OAUTH_REDIRECT_BASE=https://aibusiness.fun

5) Auth → URL config: allow https://aibusiness.fun/**

6) Update OAuth apps (X / LinkedIn / Meta / Google) to production callbacks.

7) Export any data you need from the Lovable-managed DB before disconnecting it.

8) Upgrade that single project to Pro only when you need PITR / larger limits.

Full write-up: docs/supabase.md
EOF
