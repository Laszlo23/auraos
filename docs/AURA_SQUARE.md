# Aura Square — Base ERC-6551 binder

Utility NFT on **Base**. Each Square opens a token-bound account (TBA) that can hold **AURA**, USDC, or later company tokens.

**Not** The Hood. **Not** on `/sale` or pAURA rails. **Not** a second founding collection. Cap is **1,111** so it cannot be confused with Hood’s 1,000.

Canonical AURA stays the Base ERC-20. Square is a wallet-shaped NFT around it.

## What it is / is not

| Is | Is not |
| --- | --- |
| Base ERC-721 + ERC-6551 TBA | Founding seat / Hood rebate |
| User-initiated bind after T-0 | Surprise AURA merkle into the TBA |
| Stripe → ops mint / USDC transfer | Magical fiat-in-wallet without an on-chain send |
| Soft utility | Equity, APY, Culture Coin 2 |

Do **not** reuse Robinhood CCFF00 / Tickpix TBAs. Wrong chain. Covenant forbids those on `/sale`.

Alchemy Light Accounts stay the **OS desk wallet**. Square TBA is the **token binder**. Users can have both.

## Contracts

- `contracts/square/AuraSquare.sol`
- Tokenbound registry: `0x000000006551c19487814612e58FE06813775758`
- Account V3: `0x41C8f39463A868d3A88af00cd0fe7102F30E44eC`
- SSOT: `src/lib/aura-square.ts` — CA null until `AURA_SQUARE_CA` is set

Mint v1: USDC `mint()` on Base, or `mintTo` from the Stripe minter key.

## Stripe (honest)

1. Checkout `kind=square_nft` → webhook → `mintTo(buyer)`.
2. Optional `kind=square_tba_fund` → webhook → USDC transfer into that token’s TBA.

Ops wallet pays on-chain after Stripe. Documented on `/square`. No Circle onramp yet.

## Pages

- `/square` — mint, TBA, bind copy
- `/api/square/meta/$tokenId` + `/api/square/collection`
- `/trust` lists Square as a utility binder (CA stays unpublished until announce)
