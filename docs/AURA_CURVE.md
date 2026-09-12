# AURA curve — Uni v4 locked LP (own rules)

One on-chain software token: **AURA**. It is the T-0 token already promised by live pAURA (`1 pAURA → 1.11 AURA`). Use it across Aura OS, Local, desks, and any other software we build.

TICKPIX, Hood, and CCFF00 stay **NFTs** (keys, not lottery tickets). No TICKPIX ERC-20. No second Culture Coin. No second official CA at T-0.

Canonical numbers live in `src/lib/aura-curve.ts`. This doc is the human reading of that file.

**Mint vs LP vs buys (one-pager):** [`AURA_LP_AND_MINT.md`](./AURA_LP_AND_MINT.md) — all supply is minted once at T-0; $6k is locked starting liquidity; buys do not mint into LP.

## What we promised and what changed

Public promises that stay:

- Fixed supply **777,777,777** AURA. No further mint.
- **48 hours** announce on aibusiness.fun and X `@bihary41418` before T-0. Never a surprise CA. Never a CA by DM. **T-0: Sunday 13 Sep 2026, 11:11 Europe/Vienna.** Runbook: `docs/AURA_T0_RUNBOOK.md`.
- Launch LP is **locked** (no team withdraw).
- Official CA only on the site and that X account.
- Official T-0 seed **$1,111 USDC** → launch treasury (not the sale key). Separate starting book **$6,000 USDC** at ~**$0.001**.
- Token identity: logo, socials, DexScreener JSON at `/api/token/aura` (`src/lib/aura-token-meta.ts`). Token tax **0%**. Scanner pack: `docs/AURA_DEXSCREENER.md`.
- pAURA redeem **+11%**. Hood gift **7,777** unlocked AURA at T-0. Team: 12-month cliff / 36-month vest. Project sale slice: 90 days after T-0.
- “This is software utility + a public pool. You can lose the tokens. Not equity.”

What this spec upgrades (copy that still said Uni v2 / `AuraLpSink`):

- T-0 venue is **Uniswap v4 on Base** with a **FlatStart** book (3 bands: 18M AURA near ~$0.001, then drip, then far dust) and **our** fee / burn / LP-reward hooks. Clanker deploy preset is **Standard** — never Project moon stairs.
- “Bonding curve” here means **price discovery on those locked ticks**, not a custom Bancor formula. $6k is the **starting quote**, not deep LP. Not all 46.6M LP AURA against $6k.
- Clanker SDK is the **deploy + LP-lock + fee-split engine** on Base. Users should never think they bought a random Clanker meme. Platform TGE is **not** the per-company Launch Desk (`docs/company-token-launch.md`).
- Clanker does **not** support Robinhood Chain. Launch AURA on **Base**. Hookr stays the RH infrastructure partner — optional wrapped pool later, never a second official CA at T-0.

## Supply vs pAURA

| Line | Amount | Note |
| --- | --- | --- |
| Max AURA | 777,777,777 | Hard cap. Unsold pAURA is never minted. |
| pAURA → AURA | × 1.11 | `PAURA_REDEEM_BONUS_BPS = 1100` |
| Open private sale (if sold out) | 233,333,322 AURA | From 210,210,200 pAURA |
| Project private-sale take | 23,333,310 AURA | Bought ≥48h after sale open; **90d lock after T-0** |
| Redeem reserve if sold out | 256,666,632 AURA | Open + project |
| Hood gifts | 7,777,778 | 7,777 per Hood, claim at T-0 |
| Liquidity | 46,666,667 | 18M near + 27.7M drip + 1M far. Quote side **$6,000 USDC** at ~$0.001 |
| Team | 93,333,333 | 12m cliff / 36m vest — nothing free at T-0 |

Airdrop module at T-0: **only** pAURA redeem + Hood 7,777 claim. No surprise merkle.

## Official pairs

| Phase | Pair | Role |
| --- | --- | --- |
| 1 (T-0) | **AURA/USDC** on Base Uni v4 | Official book. FlatStart (3 bands). $6k USDC at ~$0.001. |
| 3 | AURA/WETH | Same token, extra pool. Not a new coin. |
| 4 (optional) | Wrapped AURA on Robinhood + Hookr | Only after the Base book is deep. Wrapper is not the official CA. |

Company tokens from the Launch Desk are **optional outputs** later — never inputs to the official book until that book is deep.

## Fees, burn, rewards (must sum 10_000 bps)

**Token tax is 0%.** You can sell. No blacklist. Buy/sell fees traders pay sit on the official Uni v4 book, not on ERC-20 transfers (DexScreener / GoPlus 10/10). Scanner pack: [`docs/AURA_DEXSCREENER.md`](./AURA_DEXSCREENER.md).

Fee preset: **Dynamic3 (1–3%)** so thin books don’t get farmed. Sniper decay over **15 seconds** only — run scanners after it ends. Official bytecode is `AuraToken.sol`, never `ClankerTokenV4`.

Reward split of collected pool fees:

| Bucket | bps | Who |
| --- | --- | --- |
| LP stakers | 5000 | `AuraGauge` — people who stake AURA or the LP NFT |
| Protocol sink | 2500 | Ops (published sink, not a hidden EOA story) |
| Burn / buyback-burn | 1500 | `AuraBurnSink` (no withdraw) |
| Quest / LP bonus | 1000 | Weekly “provide LP” dust + education quests |

Swap burn (separate from the fee split): **15 bps** of each AURA-side swap (range we allow: 10–25). Small so the book still works.

Utility burn (optional, in-app): **1%** of compute top-up / Local boost spend, **capped** so it cannot brick supply (see `AURA_UTILITY_BURN_CAP_BPS` — lifetime cap vs max supply).

Publish these bps on `/trust` and `/token`. Never “deflationary moon.” No promised APY. Trailing 7-day fee APR is an **estimate**, labeled as such.

## Vaults and admin

| Role | Rule |
| --- | --- |
| `tokenAdmin` | Official AURA treasury `0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49`. Not Laszlo’s sale key. Not the old pAURA contract sink. |
| Team vault | 12-month cliff / 36-month vest |
| Project sale slice | 90-day lock after T-0 |
| Dev buy | Official seed **$1,111 USDC** → launch treasury (not the sale key) |
| Starting book | **$6,000 USDC** at ~$0.001 + 18M AURA near ticks. Rest of LP drips higher. |

## In-app desk (not a DEX)

`/swap` is one router, **official pairs only**, CAs from env / site SSOT.

- Quote without a wallet. Settle on Base with a wallet.
- Routes: USDC, ETH/WETH, later company tokens as **output only**.
- Stake: deposit AURA or LP NFT into `AuraGauge`. Earn fee share + Quest XP. **No promised APY** — same honesty as Hood hold-to-earn.
- Tiny swap-burn is visible on the quote.

## Quests (no game token)

Reuse the Quest registry. Do not launch a second ticker.

- `aura:first-swap` — once
- `aura:lp-week` — weekly, provide ≥X USDC-equivalent LP for 7 days
- `aura:burn-seen` — view-only education (read the burn bps on `/swap` or `/token`)
- `tickpix:clock-in` stays culture (Pit XP). Optional later: streak → dust from the 10% bonus bucket. **No mint-in-AURA.**

Leaderboard flair only. No pay-to-win multiplier that recreates a raise.

## Usecase (software, not ticker)

AURA is spend / rebate across products that are **not** the mint site:

- Aura OS compute / desks (in-app ledger can bridge: burn or lock on-chain AURA → credit, or rebate on-chain)
- Aura Local boosts
- x402 / pay-to rails
- Company-token launch desk fee (pay AURA or USDC)
- TICKPIX: **no mint-in-AURA**. Clock-in stays NFT-side.

## Trust surface (non-negotiable)

Update `/trust` + `/token` **before** T-0 (this repo does that; CAs stay null until announce):

- Official AURA CA, pool IDs, burn sink, gauge, treasury — never DM
- Diff vs Culture Coin: locked LP, fixed supply, published hooks, no surprise CA
- Software utility + a public pool. You can lose the tokens. Not equity.

## Phased build

| Phase | Ship | Not yet |
| --- | --- | --- |
| 0 | This spec + Uni v2 → v4 copy | — |
| 1 | AURA + USDC Uni v4, vaults, locked LP, sniper fees, published split, pAURA redeem, CAs on `/token` `/trust` | Multi-hop desk |
| 1.5 | Protocol fee share (25%) → grow **locked** LP / POL (publish policy first; automate after) — see [`AURA_LP_AND_MINT.md`](./AURA_LP_AND_MINT.md) | Bonding-curve remint |
| 2 | `/swap` quote + settle, gauge stake/claim, tiny swap-burn | Full DEX |
| 3 | AURA/WETH, gauge weekly UI, Quest hooks, trailing 7d fee APR | Company tokens as book input |
| 4 | Optional RH wrapper + Hookr pool | Second official CA |

## What we will not do

- A TICKPIX ERC-20 or “culture coin 2”
- Putting TICKPIX / CCFF00 on `/sale` or pAURA rails
- Custom unaudited bonding-curve math as the first launch
- Promised APY / “number go up”
- Dual official CAs at T-0
- Transfer tax / blacklist / honeypot on `AuraToken`
- `ClankerTokenV4` as official AURA
- Deploying T-0 from this spec change — announce 48h first, then set env CAs

## Deploy notes (when T-0 is announced)

1. New empty wallet. Publish launch treasury.
2. Deploy **`AuraToken.sol` first**. Then build the pool/lock/rewards spec via `buildAuraPlatformTgeSpec` (`src/lib/aura-t0-clanker.ts`) with that CA. **Do not** use the company Launch Desk. **Do not** CREATE2 `ClankerTokenV4`.
3. Pair **USDC**, FlatStart / Clanker `Standard` (never Project), $6,000 book at ~$0.001, Dynamic3 + sniper decay, reward recipients matching the 5000/2500/1500/1000 split. If Clanker cannot wrap an existing ERC-20, use a native Uni v4 locker — same fees.
4. Official seed **$1,111 USDC** via `devBuy` → launch treasury. Starting book **$6,000 USDC** is separate. Publish both. Logo + socials from `aura-token-meta.ts`. Verify on Basescan, then submit DexScreener token info from the official pair.
5. Prefund `AuraPauraRedeem` and Hood gifts. Open redeem only after the CA is public.
6. Set `AURA_TOKEN_CA`, `AURA_POOL_USDC`, `AURA_GAUGE`, `AURA_BURN_SINK`, `AURA_PROTOCOL_SINK`, `AURA_LAUNCH_TREASURY` on the VPS.
7. Hood escrow still timelocks the official-book buy. If the live escrow is still v2-pair-shaped, the guardian commits the **published** pool / router at announce — do not invent a new escrow CA.

Company Clanker deploys stay on `docs/company-token-launch.md`.
