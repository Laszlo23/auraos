# Architecture

Aura OS is a TanStack Start (Vite + React) app with Supabase auth/data and server functions for social, workers, and company ops.

## Layers

| Layer        | Where                                           | Role                                                |
| ------------ | ----------------------------------------------- | --------------------------------------------------- |
| Routes       | `src/routes/`                                   | File-based pages and API handlers                   |
| UI           | `src/components/aura/`, `src/components/ui/`    | Shell, product surfaces, shadcn primitives in use   |
| Client hooks | `src/hooks/`                                    | Data fetching / mutations against server fns        |
| Domain logic | `src/lib/*.functions.ts`, `src/lib/*.server.ts` | Auth-gated business logic and provider integrations |
| Server entry | `src/server/`                                   | Shared server helpers where needed                  |
| Schema       | `supabase/migrations/`                          | Postgres + RLS                                      |

Package manager is **npm** (`package-lock.json`). Deploy uses `scripts/deploy-app.sh` → VPS `/opt/auraos`.

## Founding seats vs compute vs sites vs token launch

- **Founding seat** — one-time $99 Stripe payment (`STRIPE_PRICE_FOUNDING_SEAT`, `kind=founding_seat`). Hard cap **1000**. Grants `founding_seats` + **exactly one** outbound invite (`invite_codes.kind=founding_invite`). Invitee still pays; invite is the right to buy. Free multi-use AURORA/ATLAS/QUANT and whitelist free mints are frozen.
- **AURA compute billing** — recurring founder plans on `/billing` (`STRIPE_PRICE_*` starter/company/scale). Separate from the seat.
- **Site products** — end-customer checkout on `/s/$slug` (`kind=site_product`).
- **Growth rewards** — in-app AURA on paid invite conversions (ledger → company reserve). Not cash, not token-launch proceeds.
- **Token launch (platform)** — marketing/countdown for Ninty AURA (`TOKEN_LAUNCH_*`); not the door into company seats.
- **Company token (optional)** — seat-gated Clanker ERC-20 + Uniswap V4 pool per company on Base. Separate from seats, Genesis, and compute AURA. See [company-token-launch.md](company-token-launch.md). Env: `CLANKER_ENABLED`, `CLANKER_PLATFORM_FEE_BPS`.

**x402 payTo:** production requires a live USDC receiver. Set `X402_PAY_TO` to the platform treasury (same as `OKX_PAYOUT_ADDRESS` is fine). If `X402_PAY_TO` is empty, the runtime falls back to `OKX_PAYOUT_ADDRESS` and logs a warning. Simulated settlement is never allowed in production. `scripts/deploy-app.sh` does **not** sync `.env` — set both on the VPS.

**Genesis Passport NFT:** optional ERC-721 utility for seated founders (not an investment, not token launch). Pay via Stripe (`kind=genesis_nft`) or mark paid after verified settlement → server-gated mint/claim. Env: `GENESIS_NFT_CONTRACT`, `GENESIS_MINTER_KEY` (server-only), `GENESIS_NFT_PRICE_USDC`.

One-invite Earn UI: `/earn`. Local/niche fields + opt-in `network_backlink` strip on published landings. Concierge: `founder_reviews` queue after first publish.

## Auth vs public vs API

- **`/_authenticated/*`** — logged-in company OS (console, connect, channels, report, soft CRUD pages). Guarded by the authenticated layout.
- **Public marketing / share** — `/`, `/share`, `/live`, `/leaderboard`, `/faq`, `/company/$slug`, `/c/$passportSlug`, `/s/$slug` (landing sites), `/w/$shareSlug`, video `/v/*`, legal pages.
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

- Founders connect **Gmail / Outlook** (Lovable app-user connectors) or **SMTP** (host/port/username/password, AES-GCM encrypted via `APP_USER_CONNECTION_KEY_SECRET`) in `mailbox.functions.ts`.
- Agents **draft** outreach; founders **send** via `sendLeadEmail` (never silent). SMTP uses Nodemailer.
- Connect + console gate when outreach exists without a mailbox.
- Gmail/Microsoft often need app passwords; custom-domain SMTP (Zoho, Migadu, Namecheap, etc.) is the happy path.

## Company landings vs passport

- **Passport** — `/company/$slug` (and `/c/$passportSlug`): live company receipts.
- **Marketing site** — `/s/$slug` from `company_sites` + in-repo Aura landing templates (`lead_magnet`, `service_offer`, `ebook_product`, `subscription_daily`). Founder edits/publishes on `/website`.
- End-customer Stripe Checkout is per-site (`site_products`) and separate from founder AURA billing on `/billing`.
- Worker tick runs `runSubscriptionContentTick` (daily drops) and `runSiteLeadsDraftTick` (draft outreach only — no auto-send).
- **Open Design** is an optional offline founder tool for inventing templates — not installed on the VPS.

## Mobile chrome (focus deck)

Authenticated shell (`shell.tsx`):

- **Horizontal swipe** between core nav routes via `useSwipeAxis` (ignores `[data-no-swipe]` and form fields).
- **Bottom tabs** + Grip sheet on small screens; content uses `pb-28` clearance.

**Command Center** (`/console`) on mobile uses a **FocusDeck** (vertical snap cards: Now → Milestone → Mission → Approvals → People → Proof). Desktop (`md+`) keeps the stacked dashboard.

Long copy uses **ExpandableCopy** → **ReadSurface** (full-screen reader). Truncation without a read path is not allowed (Apple HIG / Material guidance).

Primitives: `focus-deck.tsx`, `focus-card.tsx`, `read-surface.tsx`, `expandable-copy.tsx`.

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

1. Wildcard DNS `*.aibusiness.fun` → app; host header serves the same landing/passport as `/s/{slug}` or `/company/{slug}`.
2. Optional forward-only vanity address (e.g. Cloudflare Email Routing) → founder’s connected inbox; **send** still uses BYO OAuth or SMTP.

## Related docs

- [supabase.md](supabase.md) — local vs cloud DB
- [x-launch-drip.md](x-launch-drip.md) — scheduled posts / drip worker
- [social-channels.md](social-channels.md) — OAuth providers
