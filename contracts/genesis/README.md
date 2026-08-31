# Genesis Passport / The Hood (ERC-721)

Utility membership NFT for seated Aura founders — **not** an investment product. The mint **is** wired to the fair-launch desk: 70% USDC is trapped on-chain and can only buy AURA into the Hood gift lock.

See [`../launch/README.md`](../launch/README.md) for the escrow, gift lock, and T-0 flow.

## Security

- `MAX_SUPPLY` is an immutable **1000**. There is no `setMaxSupply`.
- After `setLaunchDesk`, every mint must be USDC-funded on `AuraLaunchEscrow`.
- `freezeMetadata()` is one-way. Freeze after art is final.
- No public free `mint()`. `MINTER_ROLE`, voucher, or the launch desk.
- App never puts `GENESIS_MINTER_KEY` in `VITE_*`.

## Deploy (Sepolia first)

Use the launch desk script so passport + escrow + gift lock are wired:

```bash
npx tsx scripts/deploy-launch.ts --sepolia
```

Constructor: `GenesisPassport(admin, launchDeskOrZero, "https://aibusiness.fun/api/genesis/meta/")`.

```bash
GENESIS_NFT_CONTRACT=0x…
VITE_GENESIS_NFT_CONTRACT=0x…
LAUNCH_ESCROW_CONTRACT=0x…
VITE_LAUNCH_ESCROW_CONTRACT=0x…
LAUNCH_GIFT_LOCK_CONTRACT=0x…
VITE_LAUNCH_GIFT_LOCK_CONTRACT=0x…
GENESIS_MINTER_KEY=0x…          # server-only; must hold USDC to fund mints
GENESIS_NFT_PRICE_USDC=299
GENESIS_NFT_MAX_SUPPLY=1000
```

5. Mainnet only after review / audit. Verify source on Basescan.

Live on Base (2026-08-31):

- Passport: [`0xaC3868bCEa80aFCCBFFf51229a614E9aD0d836d2`](https://basescan.org/address/0xaC3868bCEa80aFCCBFFf51229a614E9aD0d836d2)
- Escrow: [`0xeB29D8B005AFbfC83388093F2Fe4bcC5a93D2aC8`](https://basescan.org/address/0xeB29D8B005AFbfC83388093F2Fe4bcC5a93D2aC8)
- Gift lock: [`0xB428138f62F48eb7514d6F24CAc63D04890b74ab`](https://basescan.org/address/0xB428138f62F48eb7514d6F24CAc63D04890b74ab)

## App flow

Pay (Stripe / crypto / x402) → `genesis_purchases.status=paid` → server `fundPaid` or `mintPaid` (299 USDC on-chain) → Hood minted → 7,777 AURA reserved in the gift lock.

Giveaway codes call `mintGift` — sponsor pays $209.30 USDC into the book, recipient gets the NFT + locked gift. No founding seat.
