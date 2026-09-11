# AURA on Robinhood Chain — optional wrapper (Phase 4)

**Not a T-0 deliverable.** One official AURA contract lives on **Base**. This note exists so nobody ships a second “official CA” when RH users ask for a book.

## Why later

- Clanker SDK does not support Robinhood Chain.
- Hookr (`src/lib/hookr.ts`, hookr.fun) is the RH **infrastructure** partner — readable Uni v4 hooks — not the AURA token admin, not an airdrop portal, not Culture Coin 2.
- The Base AURA/USDC book must be deep before we wrap. A thin RH pool with a new ticker is how you recreate a rug story.

## What a wrapper is

If (and only if) RH users need to trade without leaving 4663:

1. Lock canonical Base AURA in a published bridge / lockbox (one-way or canonical messenger — pick after Base depth, not now).
2. Mint **wrapped AURA** on Robinhood Chain. That wrapper CA is labeled **wrapper**, never “AURA official.”
3. Open a Hookr pool with the **same published rule pack** (Dynamic3-class fees, tiny burn, no promised APY).
4. Show both CAs on `/trust` and `/token`: Base AURA = official. RH wrapper = optional rail.

`AURA_RH_WRAPPER` / `VITE_AURA_RH_WRAPPER` stay empty until that day. `auraRhWrapperAddress()` returns null. Do not invent one.

## What we will not do at T-0

- Publish a Robinhood AURA CA as official
- Dual-list two “same” tickers without a lock relationship
- Put TICKPIX, Hood, or CCFF00 on the wrapper
- Let Hookr DMs or a cloned ticker replace aibusiness.fun

## Hookr’s job

Pool rules before you sign. Official links: [hookr.fun](https://hookr.fun/) · [@hookrfun](https://x.com/hookrfun). A real contract address does not make a random URL legitimate.

See `docs/AURA_CURVE.md` for the Base T-0 rule pack.
