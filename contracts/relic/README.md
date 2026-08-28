# Aura Relic (ERC-721)

Numbered collectible: **Aura Relic #n / 7** on Base. Not AURA, not pAURA, not an investment product, not the Genesis Passport.

## Security

- No public `mint()`. Only `MINTER_ROLE`.
- `MAX_SUPPLY` is an immutable 7 (no admin raise).
- `pause` on admin.
- App never puts `RELIC_MINTER_KEY` or `RELIC_ANSWER_HASH` in `VITE_*` env.
- The claim phrase is **not** in this repo. Hash it off-box and set `RELIC_ANSWER_HASH` on the server only.

## Deploy (Sepolia first)

1. Install OpenZeppelin contracts in a Foundry/Hardhat workspace (or Remix with OZ imports).
2. Deploy `AuraRelic(admin, "https://aibusiness.fun/api/relic/meta/")`.
   Metadata JSON is served per token; shared art at `/relic.png`.
3. Keep `admin` as a cold key; grant `MINTER_ROLE` to the hot server minter if split.
4. Set on the app (server `.env`, never commit secrets):

```bash
RELIC_NFT_CONTRACT=0x…
VITE_RELIC_NFT_CONTRACT=0x…   # read-only for UI/explorer
RELIC_MINTER_KEY=0x…          # server-only, 32-byte hex
RELIC_ANSWER_HASH=0x…         # keccak256(utf8(normalize(phrase)))
```

`normalize` = trim, lowercase, collapse whitespace. Punctuation in the phrase is kept.

5. Mainnet (Base) only after a Sepolia dry run.

```bash
npx tsx scripts/deploy-relic.ts --sepolia
npx tsx scripts/deploy-relic.ts
npx tsx scripts/mint-relic.ts --to 0x… --id 1
```

Live on Base (2026-08-28):

- Contract: [`0xf2edf016cba775cec41c6ca308586a814f3d60f5`](https://basescan.org/address/0xf2edf016cba775cec41c6ca308586a814f3d60f5)
- Deploy tx: [`0x8c182609ac29a8225f3530d974443d9040da059f58f4d4cb52fbe4d424e0a00f`](https://basescan.org/tx/0x8c182609ac29a8225f3530d974443d9040da059f58f4d4cb52fbe4d424e0a00f)
- Admin: `0x2CCf1076A9DCA4d656A156d6036Cc2066c596AF5`

Base Sepolia dry run: [`0xf49c2eb2b162a0e2e7bf0bbe9a5fce618764a3bc`](https://sepolia.basescan.org/address/0xf49c2eb2b162a0e2e7bf0bbe9a5fce618764a3bc)

## App flow

Unlisted vault → passphrase hash-compare → `relic_claims` unique wallet/token → `mint(to, nextId)` with the minter key.
