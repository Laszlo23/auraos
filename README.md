# Aura OS

**Own a company. The staff just happen to be AI.**

Live at [aibusiness.fun](https://aibusiness.fun) · invite-only founding cohort.

Aura OS is the company operating system for founders who want agents to ship real work — posts, outreach drafts, missions, and weekly proof — without fake busy meters or invented revenue.

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
cp .env.example .env   # fill secrets
npm run db:start       # optional local Supabase — docs/supabase.md
bash scripts/fetch-media.sh
npm run dev            # often http://localhost:4000
```

Architecture overview: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Social channels

One-click connect (OAuth popup, or Warpcast approve for Farcaster):

- **X**, **Meta** (Facebook Page + Instagram), **LinkedIn**
- **TikTok** (video publish — needs TikTok Developer approval)
- **Farcaster** (Neynar managed signer)

Full setup: [docs/social-channels.md](docs/social-channels.md).

Key env (see [.env.example](.env.example)):

```
X_CLIENT_ID / X_CLIENT_SECRET
META_APP_ID / META_APP_SECRET
LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET
NEYNAR_API_KEY / NEYNAR_FARCASTER_FID / NEYNAR_CUSTODY_PRIVATE_KEY
OAUTH_REDIRECT_BASE              # https://aibusiness.fun or http://localhost:4000
APP_USER_CONNECTION_KEY_SECRET
GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY
MICROSOFT_OUTLOOK_APP_USER_CONNECTOR_CLIENT_API_KEY
LOVABLE_API_KEY
WORKER_SECRET
```

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

Worker tick (scheduled posts / engagement):

```sh
curl -H "Authorization: Bearer $WORKER_SECRET" https://aibusiness.fun/api/workers/tick
```

More: [docs/x-launch-drip.md](docs/x-launch-drip.md).

## Stack

- TanStack Start · React · TypeScript · Tailwind
- Supabase (auth, Postgres, RLS)
- Alchemy / smart wallets · Neynar · social OAuth · Lovable mailbox connectors

## Docs

| Doc | Topic |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, auth vs public, mailbox, honesty rules |
| [social-channels.md](docs/social-channels.md) | OAuth scopes, TikTok, Farcaster |
| [supabase.md](docs/supabase.md) | Local vs cloud DB |
| [x-launch-drip.md](docs/x-launch-drip.md) | Scheduled posts / drip |

## Lovable

This repo syncs with [Lovable](https://lovable.dev). Do not force-push or rewrite published history on the connected branch.

## FAQ

[https://aibusiness.fun/faq](https://aibusiness.fun/faq) · `/faq` locally.
