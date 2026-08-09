# Architecture

Aura OS is a TanStack Start (Vite + React) app with Supabase auth/data and server functions for social, workers, and company ops.

## Layers

| Layer | Where | Role |
|---|---|---|
| Routes | `src/routes/` | File-based pages and API handlers |
| UI | `src/components/aura/`, `src/components/ui/` | Shell, product surfaces, shadcn primitives in use |
| Client hooks | `src/hooks/` | Data fetching / mutations against server fns |
| Domain logic | `src/lib/*.functions.ts`, `src/lib/*.server.ts` | Auth-gated business logic and provider integrations |
| Server entry | `src/server/` | Shared server helpers where needed |
| Schema | `supabase/migrations/` | Postgres + RLS |

Package manager is **npm** (`package-lock.json`). Deploy uses `scripts/deploy-app.sh` → VPS `/opt/auraos`.

## Auth vs public vs API

- **`/_authenticated/*`** — logged-in company OS (console, connect, channels, report, soft CRUD pages). Guarded by the authenticated layout.
- **Public marketing / share** — `/`, `/share`, `/live`, `/leaderboard`, `/faq`, `/company/$slug`, `/c/$passportSlug`, `/w/$shareSlug`, video `/v/*`, legal pages.
- **OAuth / consent** — `/auth`, `/oauth/consent`, `/api/oauth/social/*` (connect callbacks).
- **API / workers** — `src/routes/api/**` (e.g. worker tick, social callbacks). Not meant as nav destinations.

`/automation` exists as an internal catalog route but is **not** in the sidebar (runner not live).

## Social connect

Entry points:

1. **UI** — `/connect` and `/channels` via `useConnectChannel` / connection hooks.
2. **Server** — `src/lib/social.functions.ts` → `social-oauth.server.ts` / `social-api.server.ts`.
3. **Farcaster** — Neynar agent signer (`NEYNAR_AGENT_ID`) one-click connect, or managed signer + Warpcast approve in `farcaster-neynar.server.ts`.

Guide: [social-channels.md](social-channels.md).

## Week in review

- Auth: `/report` → `weekly-report.functions.ts` (`getWeeklyReport`, `shareWeeklyReport`).
- Public: `/w/$shareSlug` → `getPublicWeeklyReport` (frozen snapshot, no login).

## Mailbox (BYO)

- Founders connect **Gmail / Outlook** via Lovable app-user connectors (`mailbox.functions.ts`).
- Agents **draft** outreach; founders **send** via `sendLeadEmail` (never silent).
- Connect + console gate when outreach exists without a mailbox.

## Honesty rules

- Workforce **Active** = open `running` / `queued` task for that agent (not inflated `activity` scores).
- `current_task` is set when a task starts running; cleared to idle on complete/fail.
- Activity feed copy must not claim agent movement before the worker runs.

## Trading edge pack

- **Backtest Lab** on `/trading` — walk-forward, trailing stops, fee drag, preset compare, shareable `/tb/$slug`.
- **Paper desk** — mark fills tagged `paper`; excluded from weekly arena.
- Sizing prefers **wallet USDC**; live-vs-backtest report after closed fills.
- Candle source remains an honest CEX proxy label (not Base fills).

## Phase 3 (deferred) — subdomain + vanity mail

Not implemented yet:

1. Wildcard DNS `*.aibusiness.fun` → app; host header serves the same passport as `/company/{slug}`.
2. Optional forward-only vanity address (e.g. Cloudflare Email Routing) → founder’s connected inbox; **send** still uses BYO OAuth.

## Related docs

- [supabase.md](supabase.md) — local vs cloud DB
- [x-launch-drip.md](x-launch-drip.md) — scheduled posts / drip worker
- [social-channels.md](social-channels.md) — OAuth providers
