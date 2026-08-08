# Supabase: local now, own cloud at cutover

Aura OS keeps **Postgres + Auth + Storage + RLS** on Supabase. Production uses your
**Supabase Pro** project `fjmrlnwqzjhyzerruhsq`. Day-to-day Cursor work can still use
**local Docker** so you own migrations offline.

## Do not buy a second Pro just to escape Lovable

| Phase | Backend |
|---|---|
| Local Cursor | `supabase start` → `http://127.0.0.1:54321` |
| Lovable preview | Existing managed project (manual SQL only when preview must match) |
| Production (`aibusiness.fun`) | Managed Supabase Pro (`fjmrlnwqzjhyzerruhsq`) |

## Daily local workflow

```bash
# Docker Desktop must be running
npm run db:start          # or: npx supabase start
npm run db:status         # API / Studio / keys
npm run dev               # app reads .env.local → local Supabase
```

Useful URLs after start:

- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- Mail (auth emails): http://127.0.0.1:54324

Reset DB and re-apply every file in `supabase/migrations/`:

```bash
npm run db:reset
```

Stop:

```bash
npm run db:stop
```

## Env gotcha

The Supabase CLI reads `SUPABASE_PROJECT_ID` from `.env` and uses it as the **local Docker
project name**. Do **not** put the Lovable cloud ref in `SUPABASE_PROJECT_ID` — that breaks
`supabase status` / `stop` when containers are named from `supabase/config.toml`.

Use:

- `VITE_SUPABASE_PROJECT_ID` for the app (cloud or `local`)
- `supabase/config.toml` → `project_id` for Docker container names
- `.env.local` for local URL/key overrides (never `SUPABASE_PROJECT_ID`)

## Auth redirects (already in config)

[`supabase/config.toml`](config.toml) sets `site_url` and `additional_redirect_urls` for:

- `http://localhost:8080` (Lovable Vite sandbox default)
- `http://localhost:3000` / `5173` and `127.0.0.1` variants

After changing auth config:

```bash
npm run db:stop && npm run db:start
```

Confirm in Studio → Authentication → URL Configuration, or rely on config.toml (source of truth).

### Local login broken? (common)

`.env.local` overrides Vite to local Supabase (`127.0.0.1:54321`). If Docker is not running, **every login fails**.

Fix: either start Docker + `npm run db:start`, **or** point `.env.local` at the cloud project (current default when Docker is off). Restart `npm run dev` after changing env.

**Google sign-in (production):**

1. Supabase Dashboard → Authentication → Providers → Google must be **enabled** with Client ID + Secret.
2. In Google Cloud Console → Credentials → OAuth client
   `573598326867-nhc2piqe668qa4t6t26pqllrik85vj88.apps.googleusercontent.com`,
   add Authorized redirect URI:
   `https://fjmrlnwqzjhyzerruhsq.supabase.co/auth/v1/callback`
3. Authorized JavaScript origins should include `https://aibusiness.fun` (and localhost for local).
4. Supabase Site URL / redirect allowlist must include `https://aibusiness.fun/**`.

If step 2 is missing, Google shows `redirect_uri_mismatch`. Email/password and magic link still work.

Do **not** use Lovable’s `/~oauth/initiate` broker on the VPS — that route is Cloud-only and 404s on `aibusiness.fun`.

Cloud password auth health check:

```bash
curl -sS -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  "$VITE_SUPABASE_URL/auth/v1/health"
```

## Migration discipline (source of truth)

1. **Always** add schema changes as a new file under `supabase/migrations/`
   (`YYYYMMDDHHMMSS_description.sql`).
2. Apply locally with `npm run db:reset` (or `supabase migration up`).
3. **Never** treat the Lovable SQL editor as the only copy of a change.
4. If Lovable preview must pick up a migration before cutover: open the **same file** from
   `supabase/migrations/` and paste it once in the Lovable/Supabase SQL editor.
5. Do not force-push git history while the repo is Lovable-connected ([AGENTS.md](../AGENTS.md)).

Pending / recent migrations that local already has (and Lovable may lack until pasted):

- `20260808120000_phase0_integrity.sql`
- `20260808140000_social_oauth_engagement.sql`
- `20260808160000_smart_wallet_security.sql`
- `20260808190000_channel_posts_campaign_key.sql` — `campaign_key` for fair-launch X drip idempotency

## X fair-launch drip (Channels)

See the full go-live guide: [`docs/x-launch-drip.md`](./x-launch-drip.md) (share kit, OAuth, cron, Autopublish, troubleshooting).

Short version: set `X_CLIENT_ID` / `X_CLIENT_SECRET` / `WORKER_SECRET` → cron `/api/workers/tick` → Channels **Connect X** → **Start fair-launch drip**. Never use an X password.

## Production (aibusiness.fun): Supabase Pro

Project: `fjmrlnwqzjhyzerruhsq` → `https://fjmrlnwqzjhyzerruhsq.supabase.co`

| Piece | Value |
|---|---|
| App env | `/opt/auraos/.env` on the VPS |
| Client keys | `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Server key | `SUPABASE_SERVICE_ROLE_KEY` (dashboard → API Keys) |
| Auth redirects | Site URL `https://aibusiness.fun`; allowlist `https://aibusiness.fun/**`, `https://aibusiness.fun/auth`, `https://www.aibusiness.fun/**` |
| Google | Dashboard → Authentication → Providers → Google (enable + Client ID/Secret) |
| Magic link | Works via Supabase email once Site URL / redirect allowlist include `aibusiness.fun` (see above). Invite links use `?invite=CODE` — do not use `?code=` (reserved for PKCE). |

Apply new SQL with MCP `apply_migration` or CLI `db push` after `supabase link`.
Then rebuild/restart Aura OS so Vite-baked `VITE_SUPABASE_*` keys stay in sync.

## Troubleshooting

- **Docker rate limit / pull errors**: wait and retry `npm run db:start`.
- **Analytics unhealthy**: `[analytics] enabled = false` is set in config.toml for local.
- **CLI cannot `db push` to Lovable**: expected — that project is Lovable-owned. Use local + cutover project instead.
