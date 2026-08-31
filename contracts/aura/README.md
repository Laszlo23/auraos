# Platform AURA — self-hosted T-0 (no Clanker)

Fair launch on **Uniswap v2 (Base)**. LP is permanently locked in `AuraLpSink`. Hood escrow buys via `proposeV2Market` after a 72h timelock.

## Contracts

| File | Role |
| --- | --- |
| `AuraToken.sol` | Fixed supply 777,777,777. No further mint. |
| `AuraPauraRedeem.sol` | 1 pAURA → 1.11 AURA once opened. Prefund with private-sale AURA reserve. |
| `AuraLpSink.sol` | Dead-end for Uni v2 LP tokens. No withdraw. |

Team / advisor cliffs use OpenZeppelin `VestingWalletCliff` (deployed by script, not a custom file).

## Allocations (whole tokens)

Match `src/lib/aura-token.ts` — must sum to 777,777,777.

## T-0 runbook

```bash
# Compile only
npx tsx scripts/aura-t0.ts --compile-only

# Sepolia rehearsal (needs AURA_T0_KEY + USDC on Sepolia)
npx tsx scripts/aura-t0.ts --sepolia --usdc-liquidity 50000000

# Base mainnet (guardian key; announce 48h ahead first)
npx tsx scripts/aura-t0.ts --usdc-liquidity <USDC_6_DECIMALS>
```

1. Deploy `AuraToken`, `AuraLpSink`, `AuraPauraRedeem`, vesting wallets.
2. Distribute buckets; fund redeem with open+project AURA; fund Hood gift drop (`AuraHoodGiftDrop`).
3. `addLiquidity` USDC/AURA on Uni v2; transfer LP → `AuraLpSink`.
4. Publish CA on aibusiness.fun + X `@buildingcultu3` only.
5. Guardian `proposeV2Market(aura, pair)` on live escrow.
6. Wait **72 hours**. Anyone `executeMarket()`.
7. Hood owners `claim(tokenId)` — unlocked AURA in wallet. Owner `openRedeem()` on `AuraPauraRedeem`.

## Safety checklist

- [ ] External review of AuraToken + redeem + T-0 script
- [ ] Verify source on Basescan / Sourcify
- [ ] Sepolia full rehearsal (deploy → LP sink → propose → execute → Hood claim)
- [ ] Announce T-0 **48 hours** ahead on official channels
- [ ] Set `AURA_TOKEN_CA` / `VITE_AURA_TOKEN_CA` / pair URL on VPS after deploy
- [ ] Prefund gift drop with `7,777 × minted Hoods` before execute
- [ ] Guardian renounces desk admin after funder + metadata freeze (launch README)
- [ ] No trading tax / blacklist / honeypot on AuraToken
- [ ] LP sink has zero balance-of-owner path — LP is gone
- [ ] Redeem opens only after CA is public
- [ ] 48h announce before mainnet `executeMarket` (desk timelock is 72h)

## What stays Clanker

Per-company Launch Desk tokens only (`docs/company-token-launch.md`). Not platform AURA.
