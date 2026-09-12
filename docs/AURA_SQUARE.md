# Aura Square — Base ERC-6551 binder

Utility NFT on **Base**. Each Square opens a token-bound account (TBA) that can hold **AURA**, USDC, or later company tokens.

**Not** The Hood. **Not** on `/sale` or pAURA rails. **Not** a second founding collection. Cap is **1,111** so it cannot be confused with Hood’s 1,000.

Canonical AURA stays the Base ERC-20. Square is a wallet-shaped NFT around it.

## What it is / is not

| Is | Is not |
| --- | --- |
| Base ERC-721 + ERC-6551 TBA | Founding seat / Hood rebate |
| User-initiated bind after T-0 | Surprise AURA merkle into the TBA |
| Wallet USDC `mint()` on Base | Stripe selling the NFT |
| Soft utility | Equity, APY, Culture Coin 2 |

Do **not** reuse Robinhood CCFF00 / Tickpix TBAs. Wrong chain. Covenant forbids those on `/sale`.

Alchemy Light Accounts stay the **OS desk wallet**. Square TBA is the **token binder**. Users can have both.

## Contracts

- `contracts/square/AuraSquare.sol`
- Tokenbound registry: `0x000000006551c19487814612e58FE06813775758`
- Account V3: `0x41C8f39463A868d3A88af00cd0fe7102F30E44eC`
- SSOT: `src/lib/aura-square.ts` — CA null until `AURA_SQUARE_CA` is set

Mint is **wallet-only**: approve **$11 USDC** and call `mint()`. `$111` was brand numerology (cap 1,111), not the value of an empty TBA — do not charge that while the contract is undeployed. `setMintPriceUsdc` can raise later. `mint()` reverts if price is 0, so a free mint needs a Solidity change. `mintTo` stays on the contract for ops recovery — `/square` does not open Stripe for the NFT.

## What is missing (honest)

- **Not deployed.** `auraSquareAddress()` is env-only (`AURA_SQUARE_CA`). Live CA is `null`.
- No deploy script under `scripts/` yet. Constructor needs admin, USDC, ops, Tokenbound registry + impl, price, baseURI.
- TBA is empty until AURA exists (after T-0). No surprise airdrop into it.
- Metadata/art is the app icon. No on-chain OS perk.
- Do **not** deploy Square before T-0.

## Stripe (honest)

1. NFT checkout `kind=square_nft` is refused. Buy on Base with a wallet.
2. Optional `kind=square_tba_fund` → webhook → USDC transfer into that token’s TBA (after you already hold a Square).

No Circle onramp. You can lose the tokens. Not equity.

## Pages

- `/square` — mint, TBA, bind copy
- `/api/square/meta/$tokenId` + `/api/square/collection`
- `/trust` lists Square as a utility binder (CA stays unpublished until announce)
