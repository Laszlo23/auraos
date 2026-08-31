# Aura fair-launch desk (unruggable Hood → pool)

These contracts make the Hood promise **on-chain**:

1. Every Hood mint deposits USDC. **70% ($209.30) cannot leave** except to buy AURA on the committed fair-launch pair.
2. **30% ($89.70)** goes to an **immutable** ops address (servers). Not a second hidden treasury.
3. Each Hood is allocated **7,777 AURA**, locked **90 days after T-0**. Gift Hoods still seed the book — the sponsor pays the $209.30 LP slice.
4. At T-0 a guardian **proposes** the official AURA + pair. **72 hours** later anyone can execute. USDC buys AURA; those tokens go into the gift lock (price moves up, gifts stay locked).
5. No owner withdraw. No rescue of USDC. ETH rejected. Supply of Hoods is an immutable 1,000.

This is mechanism, not a legal guarantee. Read the source. Verify on Basescan after deploy.

## What was already live (cannot be rewritten)

| Contract | Address | Residual admin power |
| --- | --- | --- |
| pAURA private sale | `0x25f42e74ce4697a29d9f252981fb9efa35aee55c` | Owner can `creditCash`, pause, close. USDC already forwards to immutable treasury. |
| Aura Relic | `0xf2edf016cba775cec41c6ca308586a814f3d60f5` | Max 7 is immutable. Admin can still change URI / pause. Freeze URI on-chain by not calling `setBaseURI`. |

Do **not** redeploy those. AURA itself still has **no CA until T-0** (Clanker). These desk contracts bind to that CA with a public timelock.

## Contracts

| File | Role |
| --- | --- |
| `GenesisPassport.sol` | Hood NFT. `MAX_SUPPLY = 1000` immutable. No `setMaxSupply`. Metadata freeze. Mint requires desk funding. |
| `AuraLaunchEscrow.sol` | USDC book. Paid mint / gift mint / fund-then-mint. Propose → 72h → buy & lock. |
| `AuraHoodGiftLock.sol` | 7,777 AURA + buy bonuses per Hood. Claim after 90 days. No clawback. |

## Deploy order (Sepolia first)

```bash
npx tsx scripts/deploy-launch.ts --sepolia
npx tsx scripts/deploy-launch.ts
```

1. `GenesisPassport(admin, address(0), "https://aibusiness.fun/api/genesis/meta/")`
2. `AuraHoodGiftLock(passport)`
3. `AuraLaunchEscrow(USDC, ops, passport, gifts, guardian)`
4. `passport.setLaunchDesk(escrow)` — **once**
5. `gifts.setDesk(escrow)` — **once**
6. `escrow.grantRole(FUNDER_ROLE, serverMinter)`
7. After art is final: `passport.freezeMetadata()`

Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`  
Default ops (same published pAURA treasury): `0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1`

### Live on Base Sepolia (2026-08-31)

| Piece | Address |
| --- | --- |
| Passport (Hood NFT) | [`0xaF4F45370C9158d664D00481f1c14eD1e04364fd`](https://sepolia.basescan.org/address/0xaF4F45370C9158d664D00481f1c14eD1e04364fd) |
| Escrow | [`0x07c7101FC42C2FEf3bc84C6ABAb400B8116dC647`](https://sepolia.basescan.org/address/0x07c7101FC42C2FEf3bc84C6ABAb400B8116dC647) |
| Gift lock | [`0x9455d5933B8bb4F15A413914A4e89694aa672D88`](https://sepolia.basescan.org/address/0x9455d5933B8bb4F15A413914A4e89694aa672D88) |
| USDC (Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Owner / admin | `0x2CCf1076A9DCA4d656A156d6036Cc2066c596AF5` |

Artifact: `contracts/launch/AuraLaunch.sepolia.json`. Desk wiring verified on-chain (`launchDesk` + gift `desk` → escrow).

### Live on Base mainnet (2026-08-31)

| Piece | Address |
| --- | --- |
| Passport (Hood NFT) | [`0xaC3868bCEa80aFCCBFFf51229a614E9aD0d836d2`](https://basescan.org/address/0xaC3868bCEa80aFCCBFFf51229a614E9aD0d836d2) |
| Escrow | [`0xeB29D8B005AFbfC83388093F2Fe4bcC5a93D2aC8`](https://basescan.org/address/0xeB29D8B005AFbfC83388093F2Fe4bcC5a93D2aC8) |
| Gift lock | [`0xB428138f62F48eb7514d6F24CAc63D04890b74ab`](https://basescan.org/address/0xB428138f62F48eb7514d6F24CAc63D04890b74ab) |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Ops (immutable) | `0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1` |
| Owner / admin | `0x2CCf1076A9DCA4d656A156d6036Cc2066c596AF5` |

Artifact: `contracts/launch/AuraLaunch.deployed.json`. Desk wiring verified on-chain.

## T-0

1. Clanker (or the published factory) creates AURA + the spot pair.
2. Publish the CA on aibusiness.fun and X `@buildingcultu3`.
3. Fund the gift lock with `7,777 × minted Hoods` AURA from the 1% public slice (7,777,778 reserved).
4. Guardian calls `proposeV2Market(aura, pair)` or `proposeAdapter` if the pool is Uniswap v4 / Clanker-only.
5. Wait 72 hours. Anyone calls `executeMarket()`. Escrowed USDC buys AURA; tokens land in the gift lock.
6. Later Hood mints: `sweepBook()` pushes new USDC the same way.
7. After 90 days, Hood holders `claim(tokenId)`.

## Unruggable checklist

- [x] Hood supply cannot be raised
- [x] Mint without USDC deposit reverts once the desk is set
- [x] 70% USDC has no withdraw-to-EOA path
- [x] 30% ops address is constructor-immutable
- [x] Gift AURA has no admin clawback
- [x] Market bind is public + 72h delay (propose resets the clock)
- [x] Uni v2 pair must be the factory pair for USDC/AURA
- [x] No ETH receive
- [ ] External audit before mainnet (do this)
- [ ] Verify source on Basescan / Sourcify after deploy
- [ ] Guardian should `renounceRole(DEFAULT_ADMIN_ROLE)` after FUNDER is set and metadata is frozen

## Early supporter wave (app gate)

Before the public drop date, the site can unlock wallet mint for the **first 333** with a server-only password:

```
HOOD_EARLY_PASS=…                 # never VITE_*
# or HOOD_EARLY_PASS_HASH=<sha256 hex of normalized pass>
```

Rate-limited unlock → 2h HMAC permit in `sessionStorage` → wallet approve/mint. Cap is enforced in the UI (next token id ≤ 333). The escrow `mintPaid` path itself remains payable on-chain; the password is the invite gate for the product surface.

## App env

```
GENESIS_NFT_CONTRACT=0x…
VITE_GENESIS_NFT_CONTRACT=0x…
LAUNCH_ESCROW_CONTRACT=0x…
VITE_LAUNCH_ESCROW_CONTRACT=0x…
LAUNCH_GIFT_LOCK_CONTRACT=0x…
VITE_LAUNCH_GIFT_LOCK_CONTRACT=0x…
GENESIS_MINTER_KEY=0x…   # server-only; needs USDC to fundPaid / fundGift
HOOD_EARLY_PASS=…        # server-only early supporter invite
```
