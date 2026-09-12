<p align="center">
  <img src="public/brand/aura-lockup.svg" alt="Aura OS" width="240" />
</p>

<h1 align="center">Aura OS</h1>

<p align="center">
  <strong>Own a company. The staff just happen to be AI.</strong><br />
  Missions, drafts, approvals, proof — not a chatbot you babysit.
</p>

<p align="center">
  <a href="https://aibusiness.fun">aibusiness.fun</a>
  ·
  <a href="https://aibusiness.fun/guide">Founder guide</a>
  ·
  <a href="https://aibusiness.fun/access">$29 / month · $299 / year</a>
</p>

<p align="center">
  <a href="https://github.com/Laszlo23/auraos/actions/workflows/ci.yml"><img src="https://github.com/Laszlo23/auraos/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
</p>

---

Aura OS is the company operating system for founders who want agents to ship real work — posts, outreach drafts, missions, and a week you can show a boss — without fake busy meters or invented revenue.

You own the company. Atlas (CEO) plus named roles plan the work. **Money and public posts wait for your yes.** Quiet weeks stay zeros.

The token is optional. The NFT is optional. The desk runs without either.

## This week

| Check | Status |
| --- | --- |
| Product | Live at [aibusiness.fun](https://aibusiness.fun) |
| CI on `main` | Tests first, then lint, then build |
| Production | Laptop script `scripts/deploy-app.sh` — GitHub does **not** deploy |
| AI | OpenRouter Auto Router when `OPENROUTER_API_KEY` is set |

Official AURA contract is unpublished until T-0. Verify CAs only on the site and X [`@bihary41418`](https://x.com/bihary41418) — never a DM.

## Get better results

Specific briefs beat vibes. The public handbook is **[aibusiness.fun/guide](https://aibusiness.fun/guide)** (same spine: [docs/FOUNDER_GUIDE.md](docs/FOUNDER_GUIDE.md)).

1. One honest sentence: what you sell, where, who pays.
2. Settings → Strategy (injected into every agent).
3. One mission with a number and a deadline.
4. Connect a channel or a mailbox before expecting outreach.
5. Approve the first three drafts. Leave Autopublish off until they sound like you.
6. Week in review → Share this week. Quiet weeks stay honest.

```text
Instead of “grow my business”
try     “Vienna nail salon. 12 bookings this month from Instagram + Google. €0 ads.”
```

## What it is / isn’t

| It is | It is not |
| --- | --- |
| A company desk: missions → approve → execute → proof | A chatbot you babysit |
| Drafts on X, Instagram, LinkedIn, Farcaster, TikTok | Silent email or silent spend |
| Aura Local for shops + Nachbar for guests | A token you must buy to use the OS |
| $29 / month or $299 / year for the seat | A second Hood or Culture Coin sequel |

## Surfaces

| You | Path |
| --- | --- |
| Command center | `/console` |
| Ask the CEO | `/ceo` |
| Missions · approvals · proof | `/missions` · `/approvals` · `/proofs` |
| Channels · connect · mailbox | `/channels` · `/connect` |
| Lead hunter (you send) | `/akquise` |
| Week in review | `/report` → public `/w/$slug` |
| Aura Local · Nachbar | `/lokal` · `/nachbar` |
| Founder guide · features · FAQ | `/guide` · `/features` · `/faq` |
| Covenant | `/trust` |

## Quickstart

Needs **Node.js 24+**, **npm** (`package-lock.json` is the source of truth), and Docker if you want local Supabase.

```sh
git clone git@github.com:Laszlo23/auraos.git
cd auraos
npm i
cp .env.example .env   # fill secrets locally — never commit .env
npm run db:start       # optional — docs/supabase.md
bash scripts/fetch-media.sh
npm run dev            # often http://localhost:4000
```

```sh
npm test               # unit tests
bash scripts/deploy-app.sh   # production — keeps /opt/auraos/.env on the VPS
```

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Deploy: [docs/deployment.md](docs/deployment.md).

## Secrets

- **Never commit** `.env`, private keys, Stripe live secrets, or service-role JWTs.
- Names and empty placeholders live only in [.env.example](.env.example).
- Production secrets stay on the VPS. Rsync never overwrites that file.
- Do not put `AURA_T0_KEY` or `AURA_ALLOW_PRE_T0_CA` on the server.

## Docs

| Who | Doc |
| --- | --- |
| Founders | [FOUNDER_GUIDE.md](docs/FOUNDER_GUIDE.md) · [aibusiness.fun/guide](https://aibusiness.fun/guide) |
| System | [ARCHITECTURE.md](docs/ARCHITECTURE.md) · [deployment.md](docs/deployment.md) · [supabase.md](docs/supabase.md) |
| Channels | [social-channels.md](docs/social-channels.md) · [x-launch-drip.md](docs/x-launch-drip.md) |
| Local / guests | [GO_TO_MARKET_LOKAL.md](docs/GO_TO_MARKET_LOKAL.md) · [CUSTOMER_APP.md](docs/CUSTOMER_APP.md) |
| Chain (optional) | [AURA_LP_AND_MINT.md](docs/AURA_LP_AND_MINT.md) · [AURA_T0_SAFETY.md](docs/AURA_T0_SAFETY.md) |

## Stack

TanStack Start · React · TypeScript · Tailwind · Supabase (auth, Postgres, RLS) · OpenRouter + fallbacks · social OAuth · Alchemy smart wallets.

This repo syncs with [Lovable](https://lovable.dev). Do not force-push or rewrite published history on the connected branch.

Operated by Ninty LLC. Aura OS is a separate product from any BCC token.
