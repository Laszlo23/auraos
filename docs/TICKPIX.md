# TICKPIX × Aura OS

Culture seats on Robinhood Chain — community membership for the tape, **not** a second founding collection and **not** a fundraise.

| Layer | Chain | Role |
| --- | --- | --- |
| **Hood / Genesis** | Base | OS founding / desk utility key |
| **TICKPIX** | Robinhood Chain `4663` | Pit culture — badge + Quest XP |

## Surfaces

| Piece | Path |
| --- | --- |
| Mint (canonical) | https://nft.aibusiness.fun |
| Aura discovery | `/pit` |
| Community covenant | `/trust` |
| HoodStreet CCFF00 | `/trust` + `docs/HOODSTREET_CCFF00.md` (NFT CA verify) |
| Hookr (RH hooks) | `docs/HOOKR.md` · hookr.fun |
| Community badge + quests | `/community` |
| Holder soft perk | `holder-perks` → `hasTickpixNft` (+5% quest XP only) |
| SSOT | `src/lib/tickpix.ts`, `src/lib/tickpix.server.ts` |

## Env (VPS)

```bash
TICKPIX_CONTRACT_ADDRESS=0xa1F563AA9AFF537b8D1dD551B4DB9eFc9EC2D117
# HoodStreet CCFF00 membership NFT (verify NFT — not meme ERC-20)
CCFF00_CONTRACT_ADDRESS=0x505A22Ffed8d37ebE580FfD98d2Cdb0021189146
# optional marketplace / collection URL override
# TICKPIX_COLLECTION_URL=https://nft.aibusiness.fun
```

Default CA matches the live mint `config.js`. Alchemy RH RPC is preferred; falls back to `https://rpc.mainnet.chain.robinhood.com`.

CCFF00 free raid copy is driven by `TICKPIX.raidEndsAt` (`2026-09-12T19:00:00.000Z`). After that instant, `/pit`, Community, share kit, and drip switch to public mint (`0.0001 ETH`) — we do not keep advertising a closed window.

## Quests

| Key | Cadence | Verification |
| --- | --- | --- |
| `tickpix:mint` | once | On-chain `balanceOf` on a linked wallet |
| `tickpix:clock-in` | daily | Honor click-through to mint site |
| `tickpix:share-tape` | weekly | Honor share of tape card |

Achievement: `tickpix-seat` (unlock event `tickpix:mint`).

## Hard nos

- Do not rebuild mint UI inside Aura `/c/$slug`
- Do not put Tickpix on `/sale` or pAURA rails
- Do not copy Hood rebates / strategy slots / season score multipliers
- Do not frame Tickpix as equity, a fund, or a second Hood
