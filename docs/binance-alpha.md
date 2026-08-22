# Binance Web3 Alpha / BNB Smart Chain readiness

Aura OS is multichain: **Base** (x402 + default prod), **BNB Smart Chain** (Binance Alpha), and **Robinhood Chain** (`4663`). See [multichain.md](./multichain.md) for the desk switcher model.

## What is live in code

| Layer                           | Base          | BSC (BNB) | Robinhood               |
| ------------------------------- | ------------- | --------- | ----------------------- |
| Alchemy Light Account + OKX DEX | yes           | yes       | yes (`chainIndex=4663`) |
| Trading desk primary pair       | WETH/USDC     | WBNB/USDC | WETH/USDG               |
| Per-company desk switcher       | yes           | yes       | yes                     |
| x402 USDC settle (EIP-3009)     | yes           | no        | no                      |
| Genesis NFT mint                | Base contract | redeploy  | redeploy                |

## Flip the desk to BSC (staging / Alpha prep)

1. Alchemy dashboard: enable **BNB Mainnet**, create a **Gas Manager** policy → copy id.
2. On the VPS `/opt/auraos/.env` (and local `.env`):

```bash
ALCHEMY_NETWORK=bsc
VITE_CHAIN_NETWORK=bsc
ALCHEMY_GAS_POLICY_ID_BSC=<alchemy-bnb-gas-policy-id>
# Keep x402 on Base while BNB desk runs:
X402_NETWORK=base
```

3. Rebuild + restart Aura.
4. `/wallet` → provision / deploy Light Account on **BSC**.
5. Fund with **BNB + USDC** (`0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`, 18 decimals).
6. `/trading` → arm live · confirm quotes use `chainIndex=56` via OKX.

## Dual-rail production (recommended)

Keep production money APIs on Base; run a **BSC desk** when preparing Alpha:

- `ALCHEMY_NETWORK=bsc` for wallets + Quant + OKX
- `X402_NETWORK=base` so machine payments keep settling in Circle USDC on Base

True simultaneous dual wallets (one address book for Base **and** BSC) is a follow-up — today one process-wide active chain.

## Alpha checklist (outside the app)

- [ ] Legal entity + KYB pack
- [ ] Token contract on **BSC**, verified on BscScan
- [ ] Security audit (CertiK / PeckShield / SlowMist / Hacken class)
- [ ] Tokenomics + vesting public
- [ ] Liquidity + market-making plan on BNB Chain
- [ ] Traction proof: `/company/aura-goods`, `/proof`, Stripe seats, x402 settled calls
- [ ] Apply via Binance Wallet Exclusive TGE / Alpha channels (official Binance support forms)

## References

- [Binance Wallet Exclusive TGE FAQ](https://www.binance.com/en/support/faq/detail/165851d47cfd4f99947e4db2de2dd80d)
- Chain registry: `src/lib/chain-config.ts`
- Tokens / explorers: `src/lib/trading/tokens.ts`
