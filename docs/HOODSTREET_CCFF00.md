# HoodStreet · CCFF00 (Proof of Neon)

Trust-first partner on Robinhood Chain. **Membership NFT**, not a second Hood, not Aura equity.

| Field                                         | Value                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Site                                          | https://hoodstreet.capital/                                                             |
| Mint                                          | https://hoodstreet.capital/ccff00                                                       |
| X                                             | [@hoodstreetcap](https://x.com/hoodstreetcap) · [@ccff00club](https://x.com/ccff00club) |
| Chain                                         | Robinhood Chain `4663`                                                                  |
| **NFT CA (verify this)**                      | `0x505A22Ffed8d37ebE580FfD98d2Cdb0021189146`                                            |
| ERC-20 inside TBA (not for membership checks) | `0x73CB777311Dc5e464C53Ddafb4496Fd87fE0eC97`                                            |
| Explorer NFT                                  | https://robinhoodchain.blockscout.com/token/0x505A22Ffed8d37ebE580FfD98d2Cdb0021189146  |

Each CCFF00 NFT is an ERC-6551 token-bound account (loaded with project tokens at mint). Aura verifies **`balanceOf` on the NFT contract** via linked wallets.

## Aura surfaces

| Piece     | Path                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| Soft perk | `hasCcff00Nft` → +5% Quest XP (stacks with Tickpix soft perk; never Hood rebates) |
| Quest     | `ccff00:verify` (once)                                                            |
| Discovery | `/pit` partner strip · `/trust` covenant                                          |
| SSOT      | `src/lib/ccff00.ts`, `src/lib/ccff00.server.ts`                                   |

## Env

```bash
CCFF00_CONTRACT_ADDRESS=0x505A22Ffed8d37ebE580FfD98d2Cdb0021189146
# optional demo wallets (comma-separated) — still verified on-chain for everyone
# CCFF00_FOUNDER_WALLETS=0x…,0x…
```

## Hard nos

- Do not treat CCFF00 as Aura founding seats or Hood dilution
- Do not verify membership via meme ERC-20 pools / ticker screenshots
- Do not put CCFF00 on `/sale` or pAURA rails
- Official CAs only on aibusiness.fun / hoodstreet.capital — never by DM

## Profit (honest)

Convert Hoodstreet members → Tickpix seats → Aura Quest/Community → OS/Local seats. Reciprocal culture membership — not token pumping.
