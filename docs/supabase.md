# Supabase: local now, own cloud at cutover

Aura OS keeps **Postgres + Auth + Storage + RLS** on Supabase. Lovable’s cloud project
(`jyiiaajyvamjabpjaltp`) is fine for preview, but day-to-day Cursor work should use
**local Docker** so you own migrations.

## Do not buy a second Pro just to escape Lovable

| Phase | Backend |
|---|---|
| Local Cursor | `supabase start` → `http://127.0.0.1:54321` |
| Lovable preview | Existing managed project (manual SQL only when preview must match) |
| Production on your server | **One** owned Supabase project (Free → Pro when needed) or self-host |

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

## Cutover: own cloud (when aibusiness.fun leaves Lovable hosting)

1. Create **one** Supabase project under your org (start Free).
2. Install CLI login: `npx supabase login`
3. Link and push:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

4. Production env on your server:

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
SITE_URL=https://aibusiness.fun
OAUTH_REDIRECT_BASE=https://aibusiness.fun
```

5. Dashboard → Auth → redirect allowlist: `https://aibusiness.fun/**`
6. Update OAuth apps (X / LinkedIn / Meta / Google) to production callback URLs.
7. Export any data you need from Lovable’s DB before disconnecting it.
8. Upgrade that single project to Pro only when you need PITR, larger limits, or team seats.

### Self-host alternative

Run the official Supabase Docker stack on your VPS if you want zero Supabase Cloud cost.
Higher ops (backups, upgrades, TLS). Prefer managed cloud unless you already run Postgres ops.

## Troubleshooting

- **Docker rate limit / pull errors**: wait and retry `npm run db:start`.
- **Analytics unhealthy**: `[analytics] enabled = false` is set in config.toml for local.
- **CLI cannot `db push` to Lovable**: expected — that project is Lovable-owned. Use local + cutover project instead.
