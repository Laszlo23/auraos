# Creator NFT contracts (Robinhood Chain)

Deploys per-creator ERC-721 collections with primary-sale mint desks.

## Contracts

| Contract | Role |
|----------|------|
| `AuraCreatorCollection.sol` | ERC-721 + EIP-2981 royalties |
| `AuraCreatorMintDesk.sol` | Primary sales in USDG or ETH |
| `AuraCollectionFactory.sol` | One-tx deploy collection + desk |

## Deploy

```bash
# Compile only
npm run contracts:compile:creator

# Robinhood mainnet (4663)
npm run contracts:deploy:creator

# Robinhood testnet (46630)
npm run contracts:deploy:creator:testnet
```

## Env

```bash
CREATOR_FACTORY_RH=0x...
CREATOR_FACTORY_RH_TESTNET=0x...
CREATOR_OPS_WALLET_RH=0x...        # platform fee recipient
CREATOR_PLATFORM_FEE_BPS=1000      # 10%
CREATOR_STABLE_RH=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168  # USDG
CREATOR_NETWORK=robinhood           # or robinhood-testnet
```

Metadata base URI pattern: `https://aibusiness.fun/api/creator/meta/{slug}/`
