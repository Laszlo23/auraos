# Platform AURA — T-0 on Uniswap v4 (Base)

Fair launch on **Uniswap v4 (Base)**. Official book is **AURA/USDC** with a locked FlatStart book ($6,000 USDC at ~$0.001) and published fee / burn / LP-reward hooks. Human spec: [`docs/AURA_CURVE.md`](../../docs/AURA_CURVE.md).

pAURA redeem and Hood gifts are unchanged: `1 pAURA → 1.11 AURA`, Hood claims 7,777 unlocked AURA at T-0.

Company Launch Desk tokens stay on Clanker presets (`docs/company-token-launch.md`). **Do not** use that desk as the platform TGE. Build the platform spec with `src/lib/aura-t0-clanker.ts` — it does not send a transaction.

Official AURA is **`AuraToken.sol`**. Clanker’s factory token (`ClankerTokenV4`) is forbidden for platform AURA — it has `admin` + `crosschainMint` and fails a DexScreener / GoPlus 10/10. Scanner pack: [`docs/AURA_DEXSCREENER.md`](../../docs/AURA_DEXSCREENER.md).

## Contracts

| File | Role |
| --- | --- |
| `AuraToken.sol` | Official ERC-20. Fixed supply 777,777,777. No owner, tax, pause, or further mint. |
| `AuraPauraRedeem.sol` | 1 pAURA → 1.11 AURA once opened. Prefund with private-sale AURA reserve. |
| `AuraBurnSink.sol` | Dead-end for swap-burn / fee-split burn. No withdraw. |
| `AuraGauge.sol` | Stake AURA to earn a share of published fees. No promised APY. |
| `AuraLpSink.sol` | Legacy Uni v2 LP sink (Hood escrow still has a v2-shaped bind). Prefer the v4 lock at T-0. |

**Phase 4 sketches (not deployed):** [`sketch/`](./sketch/) — `AuraRhLockbox` (Base) + `AuraRhWrapper` (RH). Spec: [`docs/AURA_RH_WRAPPER.md`](../../docs/AURA_RH_WRAPPER.md). Gate: [`docs/AURA_BASE_LIQUIDITY_PLAN.md`](../../docs/AURA_BASE_LIQUIDITY_PLAN.md).

Team / advisor cliffs use OpenZeppelin `VestingWalletCliff` (deployed by script, not a custom file).

## Allocations (whole tokens)

Match `src/lib/aura-token.ts` — must sum to 777,777,777. Curve bps live in `src/lib/aura-curve.ts`.

## T-0 runbook

Sunday **13 Sep 2026, 11:11 Europe/Vienna**. Operator steps: [`docs/AURA_T0_RUNBOOK.md`](../../docs/AURA_T0_RUNBOOK.md).

1. Announce **48 hours** ahead on aibusiness.fun + X `@bihary41418` (done Friday 11 Sep if the clock is live before 11:11 CEST).
2. New empty wallet = `tokenAdmin` / launch treasury. Not the sale key.
3. Deploy **`AuraToken.sol` first** (this is the official CA). Then `AuraPauraRedeem`, `AuraBurnSink`, `AuraGauge`, vesting wallets. Do **not** CREATE2 a Clanker factory token as AURA.
4. Attach the locked Uni v4 AURA/USDC book **to that CA** (Clanker pool/lock/fee-split engine, or native v4 locker) with Dynamic3 + sniper decay + 5000/2500/1500/1000 reward split. Official seed **$1,111 USDC**. If Clanker cannot wrap an existing ERC-20, use the native v4 fallback — never switch back to `ClankerTokenV4`.
5. Prefund redeem (open + project AURA) and Hood gift drop.
6. Set `AURA_TOKEN_CA`, `AURA_POOL_USDC`, `AURA_GAUGE`, `AURA_BURN_SINK`, `AURA_PROTOCOL_SINK`, `AURA_LAUNCH_TREASURY` on the VPS. Never invent a CA before this.
7. Owner `openRedeem()` only after the CA is public. Hood owners `claim(tokenId)`.
8. Guardian commits the **published** official book on the Hood escrow (72h timelock). Do not invent a new escrow CA.

Legacy compile path: `npx tsx scripts/aura-t0.ts --compile-only` (still builds the Solidity in this folder).

## Safety checklist

- [ ] External review of AuraToken + redeem + gauge + burn sink + T-0 spec
- [ ] Verify source on Basescan / Sourcify
- [ ] Announce T-0 **48 hours** ahead on official channels
- [ ] Set env CAs on the VPS after deploy — never DMs
- [ ] Prefund gift drop with `7,777 × minted Hoods` before execute
- [ ] No trading tax / blacklist / honeypot / owner / pause on AuraToken
- [ ] Burn sink and gauge have no owner-withdraw of user principal
- [ ] Redeem opens only after CA is public
- [ ] No second official CA (RH wrapper is Phase 4, labeled wrapper)
- [ ] Verify on Basescan / Sourcify, then submit DexScreener token info from the official pair
- [ ] Run GoPlus **after** the 15s sniper fee has decayed — standing token tax stays 0%

## What stays Clanker (company desk)

Per-company Launch Desk tokens only. Not platform AURA.
