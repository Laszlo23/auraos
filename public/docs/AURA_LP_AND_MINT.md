# AURA mint vs liquidity — clear overview

One-pager for founders, investors, and community. Numbers SSOT: `src/lib/aura-token.ts`, `src/lib/aura-curve.ts`. Human curve: [`AURA_CURVE.md`](./AURA_CURVE.md). Ops: [`AURA_T0_RUNBOOK.md`](./AURA_T0_RUNBOOK.md).

**This is not a bonding curve that mints into LP on every buy until supply is gone.**

---

## 1. When are all tokens minted?

| Moment | What happens |
| --- | --- |
| **T-0** (Sunday 13 Sep 2026, 11:11 Europe/Vienna) | **All 777,777,777 AURA** are minted **once** |
| **After T-0** | **No further mint.** Buys never create new AURA |

Unsold pAURA is never minted as extra AURA.

---

## 2. Where AURA goes at T-0 (fixed split)

| Bucket | AURA | Note |
| --- | --- | --- |
| Private sale (open buyers) | 233,333,322 | Redeem via pAURA (+11%) |
| Private sale (project, 90d lock) | 23,333,310 | Not free team tokens |
| Community | 186,666,699 | Rewards / contributors |
| Ecosystem | 77,777,778 | Growth / partners |
| Treasury | 77,777,778 | Company reserve |
| Team (vesting) | 93,333,333 | **12-month cliff, then 36-month linear** — nothing free at T-0 |
| Advisors (vesting) | 15,555,556 | Vesting |
| Marketing | 15,555,556 | Acquisition |
| Hood gifts | 7,777,778 | 7,777 unlocked AURA / Hood at T-0 |
| **Liquidity (locked LP)** | **46,666,667** | Uni v4 book with **$6,000 USDC** |
| **Total** | **777,777,777** | 100% |

Team Safe / vesting beneficiary is **separate** from the $6k book.

---

## 3. Starting liquidity (the $6k)

At T-0 the launch treasury funds a **locked** Uniswap v4 **AURA/USDC** FlatStart book:

| Side | Amount |
| --- | --- |
| USDC (quote) | **$6,000** |
| AURA (base) | **46,666,667** in bands (~18M near ~$0.001, ~27.7M drip, 1M far) |

- Locked — **no team withdraw**
- **Seed $1,111 USDC** = first buy into that book (dev buy). Bought AURA lands in the **launch treasury**, not a new mint

---

## 4. What every buy does after T-0

```text
Buyer pays USDC  →  pool
Buyer receives AURA ← from the pool (already minted)
Price moves on FlatStart ticks
```

| Myth | Reality |
| --- | --- |
| Every buy mints new AURA into LP | **No** — supply fixed at T-0 |
| Buys fill LP until all 777M are in the pool | **No** — only **46.7M** AURA were ever put in LP |
| Liquidity auto-grows forever from buys alone | **Only AMM rebalancing** — more USDC / less AURA in the pool when people buy |
| Fees deepen the book | **Partially** — fees are collected and split (see below), not a full re-mint into LP |

---

## 5. How liquidity can grow after T-0

| Path | Effect |
| --- | --- |
| Traders buy/sell | Price discovery; pool mix changes |
| Community **adds LP** (USDC + AURA) | Real deeper book |
| **Pool fees** (Dynamic3 ~1–3%) | Split: 50% LP stakers / 25% protocol / 15% burn / 10% quest |
| Tiny swap burn (~15 bps AURA-side) | Slight supply pressure, not LP mint |
| Later AURA/WETH (Phase 3) | Same token, more venue depth |

There is **no** “graduation” dump into another DEX. Fair launch = announced T-0 + locked book + fixed supply + same rules for everyone.

---

## 6. Automated LP growth — should we?

**Idea:** always put something back into LP on volume (protocol-owned liquidity growth).

### Too late for Sunday T-0

| Change | Before Sunday? |
| --- | --- |
| Rebuild as bonding-curve “every buy mints into LP” | **Too late / wrong** — breaks FlatStart + published covenant |
| Change seed / $6k / allocation math mid-announce | **Don’t** — trust risk |
| Ship new on-chain auto-compound hooks untested | **Too late** for a safe T-0 |

**Keep T-0 as planned:** mint once, lock $6k + 46.7M AURA, open the book.

### Not too late after T-0 (recommended Phase 1.5)

Use money we **already** collect — the **25% protocol fee share** — to grow the **locked** book over time:

1. Publish clearly: “Protocol fee share grows locked AURA/USDC LP (no team wallet).” — **done** on `/trust` + covenant (`grow-lp`) + CAS row “Protocol sink → locked LP (POL)”.
2. Ops process first week: protocol sink USDC (+ optional AURA) → **add to the same locked official book** (SOP below).
3. Later: automate on-chain if the fee recipient can be a contract that only `addLiquidity` + lock.

Also keep inviting **community LP** + AuraGauge (fee share for stakers). That is the healthy flywheel.

**Do not** route investor personal buys into team wallets. Investor capital after T-0 = **their own wallet** buying the open book (same rules).

### Week-1 fee → locked LP SOP (manual POL)

Hard rule: **grow the community book, don’t extract to ops.**

| Item | Value |
| --- | --- |
| Fee recipient | Published `AURA_PROTOCOL_SINK` / `VITE_AURA_PROTOCOL_SINK` — **dedicated** address, **not** the sale key, **not** a personal wallet, **not** the launch treasury hot key after CAs are pinned |
| Cadence | First **7 days** after T-0: sweep **≥3×/week** (e.g. Mon / Wed / Fri Europe/Vienna) |
| Action | Move **USDC** (and any **AURA**) from the protocol sink → **add liquidity to the same locked official AURA/USDC Uni v4 book only** |
| Forbidden | Sending sink fees to team Safe, personal wallets, OTC, or a new unlocked pool |
| Public note | Each POL add: post a short note + tx / Basescan receipt on **`/trust#pol`** (and pin or reply on X if volume is material) |
| Tracking | Keep a simple ops log (date, USDC in, AURA in, tx hash, pool id) |

**Operator checklist (each sweep):**

1. Confirm fee recipients on-chain match `/token` CAS: Gauge / Protocol sink / Burn / Quest.
2. Read protocol sink USDC (+ AURA) balance on Base.
3. If dust only (&lt; ~$25 combined), skip and note “dust” — still count toward cadence only when a real add happens, unless three dust weeks in a row (then raise fee routing / volume).
4. Add liquidity into the **published locked official book** (same pool id as `AURA_POOL_USDC`). Prefer matching ratio; if one-sided fees, swap the minimum needed on that same book, then add LP.
5. Confirm LP position remains locked / non-withdrawable by team (same FlatStart lock policy as T-0).
6. Publish receipt on `/trust#pol` within 24h.

**After week 1:** keep weekly POL adds while volume justifies it. Only then schedule an on-chain auto-compound vault (Phase 1.5 automation) — **not** before Sunday T-0, **not** untested on mainnet day-one.

Success bar for week 1: **≥3 visible POL adds** into the locked book with public receipts.

---

## 7. Investor one-liner (DE)

> Alle AURA werden **einmal bei T-0** gemintet. Die **6.000 USDC** sind **gesperrte Startliquidität**, kein Kauf in eine Safe. Spätere Käufe **tauschen** nur gegen das Buch — sie minten nichts Neues. Mehr Tiefe kommt durch **zusätzliche LP** und (geplant) **Protokoll-Gebühren → Locked LP**, nicht durch eine Bonding-Curve bis zur vollen Supply.

---

## Related

- Curve + fees: [`AURA_CURVE.md`](./AURA_CURVE.md)
- Sunday ops: [`AURA_T0_RUNBOOK.md`](./AURA_T0_RUNBOOK.md)
- Scanner / 0% token tax: [`AURA_DEXSCREENER.md`](./AURA_DEXSCREENER.md)
