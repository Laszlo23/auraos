# Base liquidity plan — gate before RH wrapper

**Job:** Grow the **official Base** AURA books until Phase 4 (RH wrapper) is allowed.  
**Not:** a second CA, a RH deploy, or a promised price.

Official CA: published on https://aibusiness.fun/token · never by DM.  
RH wrapper gate: [`AURA_RH_WRAPPER.md`](./AURA_RH_WRAPPER.md) §5.

---

## 1. Where liquidity lives today

| Venue | Kind | Job |
| --- | --- | --- |
| Uni **v4** AURA/USDC | Official book | Covenant / card fulfill / primary story |
| Uni **v3** AURA/USDC 0.3% | Aggregator (1inch / OKX) | USD quotes + USDC buyers |
| Uni **v3** AURA/WETH 0.3% | Aggregator | **ETH** buyers (Farcaster / Base App) |

All three are the **same** `AuraToken` CA. LP NFTs stay locked to dead / non-withdrawable sinks.

Addresses (ops artifact — always re-check `/token` / `Aura.deployed.json`):

- v4 pool id / pair: see `contracts/aura/Aura.deployed.json` → `poolId`
- v3 USDC: `poolUsdcV3`
- v3 WETH: `poolWeth`

---

## 2. Gate numbers (Phase 4 unlock)

**Either:**

- Combined Base TVL (v4 + v3 USDC + v3 WETH) **≥ $75,000** for **7 consecutive calendar days**, **or**
- Spot TVL **≥ $100,000** once **and** trailing **7d volume ≥ $25,000**

**Plus** all of:

- ≥ **3** public POL adds with Basescan receipts on `/trust#pol`
- No material security incident; GoPlus / DexScreener profile honest
- Launch treasury not drained for vanity depth (leave gas + ops buffer)

Until then: **no** `AURA_RH_WRAPPER` env, no RH mint.

---

## 3. Week-by-week POL (manual)

Source of USDC: launch treasury leftovers + protocol fee share (25%) as it accrues + optional founder top-ups labeled POL.

| Week | Action | Public |
| --- | --- | --- |
| **W0** (now) | Measure DexScreener / Gecko TVL on all three books. Snapshot in changelog | Post snapshot + CA pin |
| **W1** | Add USDC into **v3 USDC** and/or v4 locked book (whichever aggregator depth needs). Keep ETH gas | Receipt on `/trust#pol` |
| **W2** | Deepen **v3 WETH** (wrap ETH or swap USDC→WETH carefully) so Farcaster buys don’t brick | Receipt |
| **W3** | Rebalance if one venue is starved; third POL add | Receipt → gate check |

Scripts (ops, treasury key local only):

- `scripts/aura-deepen-aggregators.ts` — Uni v3 USDC / WETH deepen  
- `scripts/aura-attach-weth.ts` — WETH book attach (already done once)  
- Week-1 SOP also in [`AURA_LP_AND_MINT.md`](./AURA_LP_AND_MINT.md)

**Never** unlock dead LP. Always mint **new** positions and lock NFTs again.

---

## 4. Product rails that deepen the book

| Rail | Effect |
| --- | --- |
| `/get` card packs | Net USDC buys the **official v4** tick → USDC stays in book |
| Organic Uniswap / 1inch / OKX | Fees + inventory mix |
| Protocol 25% fee share | Manual POL until auto-compound vault (Phase 1.5) |
| Community LP | Encouraged; same lock story |

Do **not** invent a bonding-curve remint. Supply is fixed.

---

## 5. Metrics to watch

Daily (or after each POL):

1. DexScreener token page — three pairs’ `liquidity.usd`  
2. GeckoTerminal reserve USD (often indexes v3 faster)  
3. 24h / 7d volume  
4. Treasury USDC + ETH remaining (gas + next POL)  
5. Failed aggregator quotes (1inch / OKX) — deepen the thin side

Record in a short `/changelog` line or internal ops note — not a fake “APY.”

---

## 6. Messaging while we grow

- “Official AURA is on **Base**. RH wrapper is **later**, labeled wrapper.”  
- Buy: https://aibusiness.fun/get (ETH or USDC)  
- Hookr: rules infra only — [hookr.fun](https://hookr.fun/)  
- Never paste a RH CA until Phase 4 §9 checklist is done  

---

## 7. Exit into Phase 4

When §2 gate is green:

1. Open dated issue: `phase-4-rh-wrapper-YYYY-MM-DD`  
2. Follow [`AURA_RH_WRAPPER.md`](./AURA_RH_WRAPPER.md) §9  
3. Deploy sketches only after review — `contracts/aura/sketch/*` are **not** production until renamed out of `sketch/` and audited  

If the gate slips: keep POL. Do not compress 48h announce. Do not “soft launch” an unbacked RH ticker.
