# Genesis Passport (ERC-721)

Utility membership NFT for seated Aura founders — **not** an investment product and **not** part of the token launch.

## Security

- No public free `mint()`. Only `MINTER_ROLE` or EIP-712 `mintWithVoucher`.
- `maxSupply` + `pause` on admin.
- App never puts `GENESIS_MINTER_KEY` in `VITE_*` env.

## Deploy (Sepolia first)

1. Install OpenZeppelin contracts in a Foundry/Hardhat workspace (or Remix with OZ imports).
2. Deploy `GenesisPassport(admin, 1000, "https://aibusiness.fun/api/genesis/meta/")`.
   Metadata JSON is served per token; shared art at `/genesis-passport.png`.
3. Keep `admin` / minter as a cold or server-held key; grant `MINTER_ROLE` to the hot minter if split.
4. Set on the app:

```bash
GENESIS_NFT_CONTRACT=0x…
VITE_GENESIS_NFT_CONTRACT=0x…   # read-only for UI/explorer
GENESIS_MINTER_KEY=0x…          # server-only, 32-byte hex
GENESIS_NFT_PRICE_USDC=99
GENESIS_NFT_MAX_SUPPLY=1000
STRIPE_PRICE_GENESIS_NFT=price_…  # optional fiat path
```

5. Mainnet only after review / audit.

## App flow

Pay (Stripe `kind=genesis_nft` or verified settle) → `genesis_purchases.status=paid` → `claimGenesisNft` calls `mint(to, tokenId)` with the minter key.
