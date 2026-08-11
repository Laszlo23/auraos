# Aura Yield Desk — money that works for money

Research snapshot (Aug 2026) + product framing for agents that put capital to work on **Base (Aerodrome)** and **BNB Chain (Pancake / Venus / Lista)**, plus prediction and day-trade velocity.

## Thesis

Most “AI agents” burn tokens writing content. Aura’s stand-out loop:

1. **Quant** turns inventory (spot / day-trade).
2. **Yield** parks residual capital in LP, lending, ve-locks, farms, and selective prediction.
3. Founder **arms** both desks with hard USDC caps and risk-tier ceilings.
4. Paper first → live protocol rails next (OKX DeFi invest / protocol calldata via smart wallet).

## Base — Aerodrome (primary LP hub)

Aerodrome is Base’s liquidity + emissions hub (ve(3,3)):

| Role | Earns |
|------|--------|
| Traders | Efficient swaps |
| LPs (staked in gauge) | **AERO emissions** |
| LPs (unstaked) | Swap fees |
| veAERO voters | **100% of exchange revenue** (fees + bribes) on voted pools |

Flywheel: volume → fees → votes → emissions → deeper liquidity → more volume.

**Agent plays**

| Book | Risk | Notes |
|------|------|--------|
| WETH/USDC LP + gauge | Balanced | Core book; claim emissions each epoch |
| Volatile / Ignition LPs | Aggressive–Extreme | High vAPR, brutal IL — agents exit when bribes die |
| veAERO voter | Aggressive | Lock AERO, vote bribe-efficient gauges weekly |
| Aave/Morpho USDC | Conservative | Idle cash between LP / Quant windows |

Emissions ~10.9% annualized protocol-level (Apr 2026 context); **pool APYs vary wildly** with votes/bribes — never treat UI APR as guaranteed.

## BNB Chain

| Venue | Use |
|-------|-----|
| **Venus** | USDC/USDT supply — conservative parking |
| **PancakeSwap** | Stable LP + CAKE farms; volatile farms for extreme; veCAKE boost |
| **Lista** | slisBNB + lisUSD stack — BNB-native, liquidation risk |
| **Predict Fun / OPINION** | Event markets with BNB wallet distribution |

Stable lending APYs are often low-single-digit; farms spike then compress. Agents optimize **realized** harvest, not screenshot APR.

## Prediction markets

| Venue class | Chain | Agent angle |
|-------------|-------|-------------|
| Limitless / GuessMarket-class | Base | Mispricing + optional stable LP fee share |
| Predict Fun / OPINION / Myriad | BNB | Distribution where Binance wallets live |
| Polymarket | Polygon | Deepest liquidity (future adapter) |

Treat as **extreme**: binary loss, oracle risk. Size ≤10% of yield budget.

## Day trading + arb

- **Intraday ETH scalp** — 5m/15m presets on Quant desk (live-ready path).
- **Stable/basis arb scout** — OKX DEX + CEX proxy; only when edge > gas + slippage.

## Risk tiers (product)

| Tier | Examples | Max role |
|------|----------|----------|
| Conservative | Venus / Aave USDC | Sleep money |
| Balanced | Aero WETH/USDC, Pancake stables | Core compounding |
| Aggressive | veAERO, Lista, volatile Aero, arb | Active agents |
| Extreme | Volatile farms, prediction | Explicit founder ceiling |

## Autopilot engines (Aura differentiators)

| Engine | What it does |
|--------|----------------|
| **Epoch Hunter** | Tracks Aerodrome Thu–Wed epochs + Wed 23:00 UTC vote deadline |
| **Predictive Edge Scout** | Vote share vs predicted fee demand (paper model → live Sugar later) |
| **Idle Capital Router** | When Quant is flat, park residual in lending (optional auto-park) |
| **IL Thermostat** | Stress IL on LP books; auto-close paper when past budget |
| **Compound Cascade** | Harvest → swap → restake; **live:** claim AERO → USDC → Aave when opted in |
| **Risk Autopilot** | Downgrade risk ceiling on stressed drawdown |
| **Dual-Desk Choreography** | Reserve % of budget for Quant velocity vs Yield parking |

Toggle engines in the Yield Desk UI. Worker tick runs accrual + armed autopilots.

## Honesty rules (shipped in code)

- Paper accrues at **mid catalog APY** with simple interest — labeled paper, not withdrawable cash.
- **Live rail #1:** `base_aave_usdc` supplies/withdraws USDC on Aave V3 Base via smart-wallet UserOps (`src/lib/defi/aave-base.server.ts`).
- **Live rail #2:** `base_aero_usdc_weth_lp` — OKX half-swap → Aerodrome `addLiquidity` → gauge stake (`src/lib/defi/aerodrome-base.server.ts`).
- **Live rail #3:** Compound Cascade can **claim gauge AERO → OKX → USDC → Aave** when `autoCompoundLive` is on.
- **Live rail #4:** `bsc_venus_usdc` mints/redeems Venus Core vUSDC on BNB (`src/lib/defi/venus-bsc.server.ts`).
- **Live rail #5:** `bsc_pancake_stable_lp` — OKX half-swap USDC→USDT → Pancake V2 LP → MasterChef v2 stake (`src/lib/defi/pancake-bsc.server.ts`).
- Other books stay `liveReady: false` until protocol calldata is wired.
- Day-trade live = Quant desk, not fake yield marks.
- Never invent fills or overnight P&L for marketing.

## Implementation map

| Piece | Path |
|-------|------|
| Catalog | `src/lib/defi/catalog.ts` |
| Aave V3 Base | `src/lib/defi/aave-base.server.ts` |
| Aerodrome WETH/USDC | `src/lib/defi/aerodrome-base.server.ts` |
| Venus USDC (BSC) | `src/lib/defi/venus-bsc.server.ts` |
| Pancake USDT/USDC LP | `src/lib/defi/pancake-bsc.server.ts` |
| Autopilot engines | `src/lib/defi/automations.ts` |
| Accrual / open-close | `src/lib/defi/yield.server.ts` |
| Server fns | `src/lib/defi/yield.functions.ts` |
| Schema | `supabase/migrations/20260811120000_defi_yield_desk.sql` |
| UI | `src/components/aura/trading/yield-desk-panel.tsx` |
| Worker | `runYieldTick` inside `runTradingTick` |
| Agent | `Yield` in roster + `PRODUCT_AGENT_MAP.trading` |

## Next live rails (ordered)

1. Prediction adapter (Limitless or GuessMarket tx builders).
2. Multi-position Quant for true intraday inventory.
3. Aerodrome Slipstream CL + veAERO voter automation.
4. CAKE harvest → swap → optional veCAKE / Venus park.
