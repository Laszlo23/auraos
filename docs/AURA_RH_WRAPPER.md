# AURA on Robinhood Chain — Phase 4 wrapper (not official CA)

**Status:** Spec + Solidity **sketch only**. No deploy. No env CA.  
**Official AURA** stays on **Base** only: published on [`/token`](https://aibusiness.fun/token) + [`/trust`](https://aibusiness.fun/trust).

Related: [`AURA_BASE_LIQUIDITY_PLAN.md`](./AURA_BASE_LIQUIDITY_PLAN.md) (gate before this phase) · [`HOOKR.md`](./HOOKR.md) · curve phases in [`AURA_CURVE.md`](./AURA_CURVE.md).

---

## 1. One-line rule

> Base AURA = **official**. RH token = **wrapper**. Never call the wrapper “AURA CA.” Never DM either address.

Env stays empty until gate is green:

| Key | Value until Phase 4 |
| --- | --- |
| `AURA_RH_WRAPPER` | empty |
| `VITE_AURA_RH_WRAPPER` | empty |
| `AURA_RH_LOCKBOX` | empty (Base lock) |
| `auraRhWrapperAddress()` | `null` |

---

## 2. Why not now

| Constraint | Detail |
| --- | --- |
| Product | Clanker does **not** support Robinhood Chain `4663` |
| Trust | Thin RH book + new ticker reads as Culture Coin 2 |
| Depth | Base book must clear the liquidity gate first (see liquidity plan) |
| Ops | Hookr is **rules infra**, not token admin / airdrop / support DM |

---

## 3. Architecture (lock → mint → pool)

```text
User / ops on Base
        │
        │  transfer AURA
        ▼
┌───────────────────────┐
│  AuraRhLockbox (Base) │  ← sketch: contracts/aura/sketch/AuraRhLockbox.sol
│  locks canonical AURA │
│  emits Locked(...)    │
└───────────┬───────────┘
            │  off-chain / messenger attestation (pick after gate)
            ▼
┌─────────────────────────────┐
│  AuraRhWrapper (RH 4663)    │  ← sketch: contracts/aura/sketch/AuraRhWrapper.sol
│  mints wAURA 1:1            │
│  burns wAURA to unlock Base │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  Hookr Uni v4 pool on RH    │
│  same published rule pack   │
│  label: wrapper book only   │
└─────────────────────────────┘
```

**Invariant:** circulating `wAURA` on RH ≤ AURA locked in the Base lockbox (plus a published dust / fee policy if any — default **exact 1:1**, no fee on wrap).

---

## 4. Naming & surfaces

| Surface | Base AURA | RH wrapper |
| --- | --- | --- |
| Ticker in UI | `AURA` | `wAURA` or `AURA.rh` (pick one before deploy; prefer `wAURA`) |
| `/token` | Official CA + Uni books | Second row: “RH wrapper (not official)” |
| `/trust` | Verify strip #1 | Verify strip #2 with red “wrapper” badge |
| DexScreener / RH explorers | Official | Description must say wrapper + Base CA link |
| X / Farcaster | Pin Base CA | Always “wrapper · not official CA” |

---

## 5. Gate (must all be true)

From [`AURA_BASE_LIQUIDITY_PLAN.md`](./AURA_BASE_LIQUIDITY_PLAN.md):

1. **Depth:** Base official books (v4 USDC + v3 USDC + v3 WETH) combined TVL **≥ $75,000** for **7 consecutive days**, **or** ≥ **$100,000** spot once with ≥ **$25,000** 7d volume.
2. **Ops:** ≥ **3 public POL receipts** on `/trust#pol` after T-0.
3. **Safety:** AuraToken + redeem + gauge + lockbox sketch reviewed; Basescan verification green; GoPlus clean **after** sniper decay.
4. **Announce:** **48h** public note on X `@bihary41418` + Farcaster `/auraos` + `/trust` **before** any RH CA is published.
5. **Bridge choice** documented (see §6) — not improvised on deploy day.

If any gate fails → **slip Phase 4**. Keep marketing “RH later / Hookr rules.” Do not mint a lonely RH ticker.

---

## 6. Bridge options (choose at gate, not now)

| Option | Pros | Cons | Default bias |
| --- | --- | --- | --- |
| **A. Custodied attestation** — lockbox emits `Locked`; trusted relayer mints on RH | Ships fastest | Trust in relayer set | OK for **v0** with 2-of-3 multisig + public logs |
| **B. Canonical messenger** (when Base↔RH path exists) | Stronger trust | Depends on chain messaging | Prefer for **v1** |
| **C. Third-party bridge listing** | Outsource ops | We don’t control labeling | Only if they accept “wrapper” metadata |

**v0 decision (this sketch):** Option A — `AuraRhLockbox` + `AuraRhWrapper` with `minter` role held by a published multisig. Upgrade path to B without changing the Base official CA.

---

## 7. Hookr pool (RH)

- Chain: Robinhood `4663`
- Pair: **wAURA / USDG** (or RH-native stable the book actually uses — confirm at gate)
- Rules: same **spirit** as Base Dynamic3 — published fee band, tiny burn, **no promised APY**
- Lock LP or use Hookr’s non-rug posture; publish pool id on `/trust`
- Official Hookr links only: [hookr.fun](https://hookr.fun/) · [@hookrfun](https://x.com/hookrfun)

Aura does **not** run Hookr support DMs. A real CA does not make a random URL legitimate.

---

## 8. Contract sketches (not compiled into T-0)

| File | Chain | Role |
| --- | --- | --- |
| [`contracts/aura/sketch/AuraRhLockbox.sol`](../contracts/aura/sketch/AuraRhLockbox.sol) | Base | Lock / unlock canonical AURA |
| [`contracts/aura/sketch/AuraRhWrapper.sol`](../contracts/aura/sketch/AuraRhWrapper.sol) | RH 4663 | Mint / burn wAURA |

Hard rules in code comments:

- No deploy scripts that broadcast these
- No CREATE2 “surprise” CA
- Wrapper **cannot** be set as `AURA_TOKEN_CA`

---

## 9. Publish checklist (when gate is green)

1. Freeze bridge choice (A or B) in changelog + `/trust`
2. Deploy **lockbox on Base** from a new empty ops wallet (not the launch treasury if possible)
3. Deploy **wrapper on RH**; minter = published multisig
4. External review + explorer verify both
5. **48h announce** (no RH CA until announce starts; CA only after lockbox is live)
6. Set `AURA_RH_LOCKBOX`, `AURA_RH_WRAPPER`, `VITE_*` on VPS
7. Seed Hookr book with **wrapper inventory that is fully backed** by locked Base AURA
8. Update DexScreener / RH token info: “Wrapped AURA · official on Base …”
9. Never put TICKPIX / Hood / CCFF00 on the wrapper

---

## 10. What we will not do

- Publish RH AURA as official
- Dual-list two “same” tickers without a lock relationship
- Ship Phase 4 before the liquidity gate
- Invent a CA in DMs or Telegram
- Use ClankerTokenV4 / company Launch Desk for the wrapper
- Promise APY on the Hookr book

---

## 11. Near-term (do this instead of deploying)

1. Follow [`AURA_BASE_LIQUIDITY_PLAN.md`](./AURA_BASE_LIQUIDITY_PLAN.md) — POL + deepen Uni v3 books  
2. Keep Hookr as **rules** marketing, not a fake AURA CA  
3. Point RH users to Base buy: https://aibusiness.fun/get  

When the gate is green, open a dated Phase-4 deploy issue and run §9.
