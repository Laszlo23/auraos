# Genesis Passport / The Hood (ERC-721)

Utility membership NFT for seated Aura founders — **not** an investment product. The mint **is** wired to Launch Desk v2: 70% USDC is trapped on-chain and can only buy AURA into the Hood gift drop (claim unlocked at T-0).

See [`../launch/README.md`](../launch/README.md) for the escrow, GiftDrop, and T-0 flow.

## Security

- `MAX_SUPPLY` is an immutable **1000**. There is no `setMaxSupply`.
- After `setLaunchDesk`, every mint must be USDC-funded on `AuraLaunchEscrow`.
- `freezeMetadata()` is one-way. Freeze after art is final.
- No public free `mint()`. `MINTER_ROLE`, voucher, or the launch desk.
- App never puts `GENESIS_MINTER_KEY` in `VITE_*`.

## Deploy (Sepolia first)

Use the launch desk script so passport + escrow + GiftDrop are wired:

```bash
npx tsx scripts/deploy-launch.ts --sepolia
```

Constructor: `GenesisPassport(admin, launchDeskOrZero, "https://aibusiness.fun/api/genesis/meta/")`.

```bash
GENESIS_NFT_CONTRACT=0x…
VITE_GENESIS_NFT_CONTRACT=0x…
LAUNCH_ESCROW_CONTRACT=0x…
VITE_LAUNCH_ESCROW_CONTRACT=0x…
LAUNCH_GIFT_LOCK_CONTRACT=0x…   # Desk v2: AuraHoodGiftDrop
VITE_LAUNCH_GIFT_LOCK_CONTRACT=0x…
GENESIS_MINTER_KEY=0x…          # server-only; must hold USDC to fund mints
GENESIS_NFT_PRICE_USDC=299
GENESIS_NFT_MAX_SUPPLY=1000
```

5. Mainnet only after review / audit. Verify source on Basescan.

Live on Base Desk v2 (2026-08-31):

- Passport: [`0x28eab56b26d4020d0fe985aae96bc2a8dd98d99b`](https://basescan.org/address/0x28eab56b26d4020d0fe985aae96bc2a8dd98d99b)
- Escrow: [`0x09aab7435ebf3e4b3763a1462279ab093d1268f8`](https://basescan.org/address/0x09aab7435ebf3e4b3763a1462279ab093d1268f8)
- Gift drop: [`0x09D20a80abcf7f23baa5138C2115AEbC846716C9`](https://basescan.org/address/0x09D20a80abcf7f23baa5138C2115AEbC846716C9)

Desk v1 (90-day lock) is archived in [`../launch/AuraLaunch.v1-superseded.json`](../launch/AuraLaunch.v1-superseded.json).

## App flow

Pay (Stripe / crypto / x402) → `genesis_purchases.status=paid` → server `fundPaid` or `mintPaid` (299 USDC on-chain) → Hood minted → 7,777 AURA reserved in the gift drop → at T-0 owner `claim(tokenId)` into wallet.

Giveaway codes call `mintGift` — sponsor pays $209.30 USDC into the book, recipient gets the NFT + gift allocation. No founding seat.
