# AURA — DexScreener / GoPlus 10/10

Traders treat **10/10** as: no warning flags on the ERC-20, complete token info, verified source, locked official LP. Boosts are paid ads, not safety.

Official token is [`contracts/aura/AuraToken.sol`](../contracts/aura/AuraToken.sol). Buy/sell fees sit on the **Uni v4 pool**, not on transfers. SSOT: [`src/lib/aura-scanner.ts`](../src/lib/aura-scanner.ts).

**Do not** deploy T-0 from this doc. CAs stay unpublished until the 48h announce.

## Token flags (must stay zero)

| GoPlus field | Expected |
| --- | --- |
| `is_honeypot` | `0` |
| `is_mintable` | `0` (constructor mint only) |
| `is_proxy` | `0` |
| `can_take_back_ownership` | `0` |
| `hidden_owner` | `0` |
| `transfer_pausable` | `0` |
| `is_blacklisted` | `0` |
| `selfdestruct` | `0` |
| `owner_change_balance` | `0` |
| `buy_tax` / `sell_tax` | `0` (token). Pool fee is 1–3% and labeled separately |

Ownership: **none**. There is no owner to renounce.

`AuraBurnSink` and `AuraGauge` have no owner-withdraw of user principal. pAURA sale / redeem / escrow have admins — they are **not** the DexScreener token.

## Why not ClankerTokenV4

Clanker’s factory token has `admin`, `updateAdmin`, and `crosschainMint`. Scanners score that as mintable + owner not renounced. Platform T-0 deploys **AuraToken first**, then attaches the locked AURA/USDC book to that CA.

If Clanker cannot wrap an existing ERC-20, use a native Uni v4 Position Manager + published lock with the same Dynamic3 / 50-25-15-10 split / 15 bps burn. Do **not** silently switch back to `ClankerTokenV4`.

## Fees traders pay

Public line: *Token tax 0%. Trading fee 1–3% on the official AURA/USDC pool. 0.15% swap burn. You can sell.*

| Layer | Number |
| --- | --- |
| Token transfer tax | **0 / 0** |
| Official pool (both sides) | 1% min / 3% max Dynamic3 |
| Sniper window | ~66% → ~4% over **15 seconds** — anti-bot only |
| Swap burn | 15 bps AURA-side |
| Fee split | 50 / 25 / 15 / 10 LP / ops / burn / Quest |

Run scanners **after** sniper decay. The 66% is not a standing tax.

## Profile pack

JSON: `/api/token/aura` (`src/lib/aura-token-meta.ts`).

- Icon: `https://aibusiness.fun/brand/aura-mark.png`
- Header: `/og/token.jpg`
- Description under ~200 characters
- Links: `/token`, X, Farcaster, Discord, Telegram — direct HTTPS, no link-in-bio
- Square / Hood / TICKPIX are not this token

After T-0: verify on Basescan / Sourcify, then submit DexScreener **Update Token Info** from the official pair. Never from a clone. Never by DM.

## Honest limits

- DexScreener cannot score the pair until the official pool is live and indexed.
- Official seed **$1,111 USDC** is the published treasury seed. Starting book is **$6,000 USDC** at ~$0.001 — still not deep LP.
- 10/10 is the **contract + profile** bar, not a promise that volume will print.
- Related admin contracts (pAURA, redeem, escrow) stay off the pair page.

## After announce (ops)

1. Deploy `AuraToken.sol` from the new empty launch treasury.
2. Verify source on Basescan / Sourcify.
3. Attach locked Uni v4 AURA/USDC. Publish the pool id on `/token` and `/trust`.
4. Wait for the 15s sniper window to end. Scan with GoPlus.
5. Submit DexScreener token info from the official pair using the JSON above.
