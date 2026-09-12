# AURA Private Sale (pAURA)

Receipt ERC-20 for the pre-Clanker sale. **Not** launched AURA. At T-0, 1 pAURA is intended to convert to 1.11 AURA.

## Parameters

- Name / symbol: `AURA Private Sale` / `pAURA`
- Chain: Base
- Pay-in: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- pAURA contract USDC sink (immutable `TREASURY()`, **not** the official AURA treasury): `0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1`
- Official AURA treasury: `0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49`
- Price: `$1,000,000 / 777,777,777` USDC per pAURA
- Cap: `231,231,200` pAURA (~33% of AURA after +11%)
- Min buy: `50` USDC
- Cash credits: `creditCash` — owner only (Desk → Laszlo)

## Deploy

```bash
npx tsx scripts/deploy-private-sale.ts
```

Uses `PRIVATE_SALE_DEPLOYER_KEY` (falls back to `GENESIS_MINTER_KEY` or `PRIVATE_KEY`). Never put the key in `VITE_*`.

Live on Base (2026-08-24):

- Contract: [`0x25f42e74ce4697a29d9f252981fb9efa35aee55c`](https://basescan.org/address/0x25f42e74ce4697a29d9f252981fb9efa35aee55c)
- Deploy tx: [`0x684b33ab72d4184676574a193eb82d871f650ee5a052f2f7b4d691da6c797106`](https://basescan.org/tx/0x684b33ab72d4184676574a193eb82d871f650ee5a052f2f7b4d691da6c797106)
- Owner: `0x2CCf1076A9DCA4d656A156d6036Cc2066c596AF5`

Set:

```
PRIVATE_SALE_CONTRACT=0x25f42e74ce4697a29d9f252981fb9efa35aee55c
VITE_PRIVATE_SALE_CONTRACT=0x25f42e74ce4697a29d9f252981fb9efa35aee55c
```

Source-verified on Sourcify (exact match) and submitted to Basescan / Blockscout.

```bash
npx tsx scripts/verify-private-sale-onchain.ts
npx tsx scripts/verify-private-sale-sourcify.ts
```
