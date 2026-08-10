# Aura OS

**Own a company. The staff just happen to be AI.**  
**Aura Lokal** — phone-first OS for local service businesses (DE/AT).

Live at [aibusiness.fun](https://aibusiness.fun) · founding OS cohort + [Lokal landing](https://aibusiness.fun/lokal).

Aura OS is the company operating system for founders who want agents to ship real work — posts, outreach drafts, missions, and weekly proof — without fake busy meters or invented revenue.

Aura Lokal is the same organism, tailored for shops: social, customers, Review Boost invites, and Boost packs under a German phone shell. Go-to-market for the first **1000 local seats** is documented in [docs/GO_TO_MARKET_LOKAL.md](docs/GO_TO_MARKET_LOKAL.md). The patron (customer) earn app vision is in [docs/CUSTOMER_APP.md](docs/CUSTOMER_APP.md).

## What it is

| You | Agents |
|---|---|
| Own the company, approve the plan, connect channels & mailbox | Atlas (CEO), Vela, Orin, Iris, Cass, Juno, Ledger, Quant |
| See tasks move only when the worker runs them | Draft social, research leads, execute approved tasks |
| Send email from **your** Gmail/Outlook | Never silent-send mail |

Honest by default: workforce **Active** means a real queued/running task; quiet weeks stay zeros.

## Surfaces

| Surface | Path | Purpose |
|---|---|---|
| Command center | `/console` | Missions, workforce, approvals, live activity |
| Aura Lokal (DE/EN) | `/lokal` | Local-business landing (browser language + toggle) |
| Local funnel (EN) | `/for/local` | English local / Review Boost funnel |
| Public shop card | `/b/$slug` | Homepage + socials + review CTA |
| Aura Nachbar | `/nachbar` | Patron app — check-in, earn, friends |
| Review invite bridge | `/r/review/$token` | Nachbar CTA + optional unpaid Google |
| Connect | `/connect` | Socials, mailbox, wallet |
| Channels | `/channels` | Publish, drip, reply modes |
| Akquise | `/akquise` | Lead research + founder-approved send |
| Week in review | `/report` | Boss-ready 7-day summary |
| Public report | `/w/$slug` | Shareable snapshot (no login) |
| Company passport | `/company/$slug` | Public company page |
| FAQ | `/faq` | Product answers for founders |

## Quickstart

Needs **Node.js**, **npm** (`package-lock.json` is the source of truth), and Docker if you want local Supabase.

```sh
git clone git@github.com:Laszlo23/auraos.git
cd auraos
npm i
cp .env.example .env   # fill secrets locally — never commit .env
npm run db:start       # optional local Supabase — docs/supabase.md
bash scripts/fetch-media.sh
npm run dev            # often http://localhost:4000
```

Architecture overview: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Secrets

- **Never commit** `.env`, private keys, Stripe live secrets, or service-role JWTs.
- Variable **names** and empty placeholders live only in [.env.example](.env.example).
- Production secrets stay on the VPS (`/opt/auraos/.env`); deploy rsync never overwrites that file.
- Docs may name env vars; they must never contain real values.

## Locale (DE / EN)

UI language follows `?lang=` / `/lokal` → stored `aura.ui_locale` → browser `navigator.language` → `en`. Toggle EN/DE in the Lokal shell and marketing headers. Catalog: `src/lib/i18n/`. Stripe smoke checklist: [docs/STRIPE_CHECKLIST.md](docs/STRIPE_CHECKLIST.md).

## FIO crypto handles

FIO is Aura's **primary crypto-handle rail** (receive / map wallets). In-app `@handles` stay for social/leaderboard. See [docs/FIO.md](docs/FIO.md). Smoke: `node scripts/fio-smoke.mjs`.

## Social channels

One-click connect (OAuth popup, or Warpcast approve for Farcaster):

- **X**, **Meta** (Facebook Page + Instagram), **LinkedIn**
- **TikTok** (video publish — needs TikTok Developer approval)
- **Farcaster** (Neynar managed signer)

Full setup: [docs/social-channels.md](docs/social-channels.md). OAuth and connector env names: [.env.example](.env.example).

OAuth callback for social providers:

`{OAUTH_REDIRECT_BASE}/api/oauth/social/callback`

## Mailbox

Connect **Gmail** or **Outlook** on `/connect`. Agents draft outreach; you send from that address. Aura never emails silently.

Vanity `@slug` addresses and `{slug}.aibusiness.fun` hosting are deferred — noted in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Week in review

Open **Week in review**, then **Share this week**. That freezes a 7-day snapshot and gives a public `/w/...` link for your boss — posts, replies, tasks, agent actions. Quiet weeks stay honest zeros.

## Deploy

```sh
bash scripts/deploy-app.sh
```

Keeps `/opt/auraos/.env` on the VPS (never overwritten by rsync). Add new secrets on the VPS, then restart `auraos`.

Worker tick (scheduled posts / engagement) uses a bearer secret from the server env — see [.env.example](.env.example) and [docs/x-launch-drip.md](docs/x-launch-drip.md).

## Stack

- TanStack Start · React · TypeScript · Tailwind
- Supabase (auth, Postgres, RLS)
- Alchemy / smart wallets · Neynar · social OAuth · Lovable mailbox connectors

## Docs

| Doc | Topic |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, auth vs public, mailbox, honesty rules |
| [GO_TO_MARKET_LOKAL.md](docs/GO_TO_MARKET_LOKAL.md) | First 1000 local businesses, referral flywheel |
| [CUSTOMER_APP.md](docs/CUSTOMER_APP.md) | Patron app (Aura Nachbar): earn, onboard, UI |
| [social-channels.md](docs/social-channels.md) | OAuth scopes, TikTok, Farcaster |
| [supabase.md](docs/supabase.md) | Local vs cloud DB |
| [x-launch-drip.md](docs/x-launch-drip.md) | Scheduled posts / drip |

## Lovable

This repo syncs with [Lovable](https://lovable.dev). Do not force-push or rewrite published history on the connected branch.

## FAQ

[https://aibusiness.fun/faq](https://aibusiness.fun/faq) · `/faq` locally.
