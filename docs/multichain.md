# Multichain desks (Base · BSC · Robinhood)

Aura companies pick a **desk network** (`companies.desk_network`). Wallet balances, OKX DEX swaps, and Quant fills run on that chain. **x402 settlement stays on Base.**

## Supported desks

| Network              | Chain ID    | Native | Quote stable  | Primary pair | OKX DEX                 |
| -------------------- | ----------- | ------ | ------------- | ------------ | ----------------------- |
| Base                 | 8453        | ETH    | USDC          | WETH/USDC    | yes                     |
| BNB Smart Chain      | 56          | BNB    | USDC (18 dec) | WBNB/USDC    | yes                     |
| Robinhood Chain      | 4663        | ETH    | **USDG**      | WETH/USDG    | yes (`chainIndex=4663`) |
| opBNB / Base Sepolia | 204 / 84532 | —      | —             | —            | staging                 |

## How it works

1. One Light Account owner key (encrypted) → same CREATE2 address on every EVM desk.
2. `wallet_bindings.deployed_chains` tracks bytecode per chain.
3. Wallet + Trading UI: **Desk chain** switcher → `setDeskNetwork` → refreshes treasury / OKX / readiness.
4. Trading worker resolves `companies.desk_network` per company (not process-wide `ALCHEMY_NETWORK` alone).

## Env

```bash
ALCHEMY_NETWORK=base          # default when company has no preference
DESK_NETWORKS=base,bsc,robinhood
X402_NETWORK=base             # always Base for machine payments
ALCHEMY_GAS_POLICY_ID_BASE=
ALCHEMY_GAS_POLICY_ID_BSC=
ALCHEMY_GAS_POLICY_ID_ROBINHOOD=
VITE_CHAIN_NETWORK=base
```

Create an Alchemy app + Gas Manager policy on **Robinhood Chain** (`robinhood-mainnet.g.alchemy.com`).

## Robinhood notes

- Stable is **USDG** (`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`), not Circle USDC.
- WETH: `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`.
- Genesis NFT mint remains Base until a Robinhood contract ships.
- Account Kit: viem `robinhood` chain + Alchemy RPC URLs (not a stock `@account-kit/infra` export yet).

## Account Kit upgrade watch

`@account-kit/infra` still pulls `alchemy-sdk` → ethers v5 (`elliptic`) and Segment via `@account-kit/logging`. That is the remaining high npm-audit path. **Do not rewrite the Light Account / wallet stack** until Alchemy ships an ethers-v5 / Segment-free Account Kit. Track `@account-kit/infra` and `@account-kit/smart-contracts` (current pin `^4.88.4`); only then drop the ethers/elliptic tree.

## Ops checklist

- [ ] Alchemy Robinhood app + gas policy id on VPS
- [ ] Fund Light Account with ETH + USDG on chain 4663
- [ ] Switch desk in `/wallet` → deploy if needed → arm Quant
- [ ] Confirm OKX quote `chainIndex=4663`
