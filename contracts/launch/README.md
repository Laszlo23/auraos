# Aura fair-launch desk v2 (instant AURA → wallet)

These contracts make the Hood promise **on-chain**:

1. Every Hood mint deposits USDC. **70% ($209.30) cannot leave** except to buy AURA on the committed fair-launch pair.
2. **30% ($89.70)** goes to an **immutable** ops address (servers). Not a second hidden treasury.
3. Each Hood is allocated **7,777 AURA**, claimable **into the owner's wallet at T-0** (no lock). Gift Hoods still seed the book — the sponsor pays the $209.30 LP slice.
4. At T-0 a guardian **proposes** the official AURA + pair. **72 hours** later anyone can execute. USDC buys AURA; those tokens go into the gift drop as claimable bonuses.
5. No owner withdraw. No rescue of USDC. ETH rejected. Supply of Hoods is an immutable 1,000.

Marketing one-liner: *Mint the Hood. Open the market. AURA hits your wallet. LP is locked forever.*

This is mechanism, not a legal guarantee. Read the source. Verify on Basescan after deploy.

## Desk v1 superseded

| Piece | Address (archived) |
| --- | --- |
| Passport | `0xaC3868bCEa80aFCCBFFf51229a614E9aD0d836d2` |
| Escrow | `0xeB29D8B005AFbfC83388093F2Fe4bcC5a93D2aC8` |
| Gift lock (90d) | `0xB428138f62F48eb7514d6F24CAc63D04890b74ab` |

v1 cannot change `LOCK_DAYS` or re-point `setLaunchDesk`. Artifact: [`AuraLaunch.v1-superseded.json`](./AuraLaunch.v1-superseded.json). Snapshot holders before cutover:

```bash
npx tsx scripts/migrate-hood-v1.ts
```

## What was already live (cannot be rewritten)

| Contract | Address | Residual admin power |
| --- | --- | --- |
| pAURA private sale | `0x25f42e74ce4697a29d9f252981fb9efa35aee55c` | Owner can `creditCash`, pause, close. USDC already forwards to immutable treasury. |
| Aura Relic | `0xf2edf016cba775cec41c6ca308586a814f3d60f5` | Max 7 is immutable. Admin can still change URI / pause. Freeze URI on-chain by not calling `setBaseURI`. |

Do **not** redeploy those. AURA itself still has **no CA until T-0** (Uni v4 AURA/USDC on Base). These desk contracts bind to that CA with a public timelock.

## Contracts

| File | Role |
| --- | --- |
| `GenesisPassport.sol` | Hood NFT. `MAX_SUPPLY = 1000` immutable. No `setMaxSupply`. Metadata freeze. Mint requires desk funding. |
| `AuraLaunchEscrow.sol` | USDC book. Paid mint / gift mint / fund-then-mint. Propose → 72h → buy into gift drop. |
| `AuraHoodGiftDrop.sol` | **v2** — 7,777 AURA + buy bonuses. Claim at T-0 into wallet. No clawback. |
| `AuraHoodGiftLock.sol` | **Deprecated v1** — 90-day lock. Do not deploy for new desks. |

## Deploy order (Sepolia first)

```bash
npx tsx scripts/deploy-launch.ts --compile-only
npx tsx scripts/deploy-launch.ts --sepolia
npx tsx scripts/deploy-launch.ts
```

1. `GenesisPassport(admin, address(0), "https://aibusiness.fun/api/genesis/meta/")`
2. `AuraHoodGiftDrop(passport)`
3. `AuraLaunchEscrow(USDC, ops, passport, gifts, guardian)`
4. `passport.setLaunchDesk(escrow)` — **once**
5. `gifts.setDesk(escrow)` — **once**
6. `escrow.grantRole(FUNDER_ROLE, serverMinter)`
7. After art is final: `passport.freezeMetadata()`
8. Point env at the new CAs (see App env). Pause promoting v1 CAs.

Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`  
Default ops (same published pAURA treasury): `0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1`

### Live on Base Sepolia (Desk v2 — 2026-08-31)

| Piece | Address |
| --- | --- |
| Passport (Hood NFT) | [`0xdc7c7b0f59181dfb60c27fea663a16348f749908`](https://sepolia.basescan.org/address/0xdc7c7b0f59181dfb60c27fea663a16348f749908) |
| Escrow | [`0xf22382855266aafc8bf6df7b611282793c010765`](https://sepolia.basescan.org/address/0xf22382855266aafc8bf6df7b611282793c010765) |
| Gift drop (instant) | [`0x449168083441F185C9993f938e3a7cD3cbB2F166`](https://sepolia.basescan.org/address/0x449168083441F185C9993f938e3a7cD3cbB2F166) |
| USDC (Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

Artifact: `contracts/launch/AuraLaunch.sepolia.json`.

### Live on Base mainnet (Desk v2 — 2026-08-31)

| Piece | Address |
| --- | --- |
| Passport (Hood NFT) | [`0x28eab56b26d4020d0fe985aae96bc2a8dd98d99b`](https://basescan.org/address/0x28eab56b26d4020d0fe985aae96bc2a8dd98d99b) |
| Escrow | [`0x09aab7435ebf3e4b3763a1462279ab093d1268f8`](https://basescan.org/address/0x09aab7435ebf3e4b3763a1462279ab093d1268f8) |
| Gift drop (instant) | [`0x09D20a80abcf7f23baa5138C2115AEbC846716C9`](https://basescan.org/address/0x09D20a80abcf7f23baa5138C2115AEbC846716C9) |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Ops (immutable) | `0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1` |

Artifact: `contracts/launch/AuraLaunch.deployed.json`. Desk wiring verified (`launchDesk` + gift `desk` → escrow). `LOCK_DAYS = 0`.

### Live CAs

Prefer the tables above. Artifacts are authoritative after deploy — never invent a CA in app code.

## T-0

Sunday **13 Sep 2026, 11:11 Europe/Vienna**. Full operator script: [`docs/AURA_T0_RUNBOOK.md`](../../docs/AURA_T0_RUNBOOK.md).

1. Deploy platform AURA (Uniswap v4 AURA/USDC on Base — locked LP, published hooks). Spec: `docs/AURA_CURVE.md`. **Not** the company Clanker desk.
2. Publish the CA on aibusiness.fun and X `@buildingcultu3`.
3. Fund the gift drop with `7,777 × minted Hoods` AURA from the 1% public slice (7,777,778 reserved) — the T-0 script does this when `LAUNCH_GIFT_LOCK_CONTRACT` is set (env name kept; value is GiftDrop).
4. Guardian calls `proposeV2Market(aura, pair)` (`--propose` on the script, or manually).
5. Wait 72 hours. Anyone calls `executeMarket()`. Escrowed USDC buys AURA; tokens land in the gift drop.
6. Later Hood mints: `sweepBook()` pushes new USDC the same way.
7. Owner `openRedeem()` on `AuraPauraRedeem`. Hood holders `claim(tokenId)` — **unlocked AURA in wallet**.

See [`contracts/aura/README.md`](../aura/README.md) for the full self-hosted checklist.

## Safety gate (before mainnet `executeMarket`)

- [ ] External audit / peer review of Desk v2 + AuraToken path
- [ ] Verify source on Basescan / Sourcify (passport, escrow, GiftDrop, AuraToken, LpSink, Redeem)
- [ ] Publish CAs on aibusiness.fun + X `@buildingcultu3`
- [ ] **48h public announcement** after `proposeV2Market` (timelock is 72h — announce early)
- [ ] Confirm GiftDrop funded with `7,777 × minted` (plus dust plan)
- [ ] Confirm launch LP is the locked Uni v4 AURA/USDC position (no team withdraw)
- [ ] Guardian `renounceRole(DEFAULT_ADMIN_ROLE)` after FUNDER set + metadata frozen
- [ ] Sepolia rehearsal: mint → propose → execute → claim → wallet balance

## Unruggable checklist

- [x] Hood supply cannot be raised
- [x] Mint without USDC deposit reverts once the desk is set
- [x] 70% USDC has no withdraw-to-EOA path
- [x] 30% ops address is constructor-immutable
- [x] Gift AURA has no admin clawback
- [x] Claim at T-0 (Desk v2) — no 90-day hostage
- [x] Market bind is public + 72h delay (propose resets the clock)
- [x] Official book is the published Uni v4 AURA/USDC pool (same token; no second CA)
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
LAUNCH_GIFT_LOCK_CONTRACT=0x…   # Desk v2: AuraHoodGiftDrop address
VITE_LAUNCH_GIFT_LOCK_CONTRACT=0x…
GENESIS_MINTER_KEY=0x…   # server-only; needs USDC to fundPaid / fundGift
HOOD_EARLY_PASS=…        # server-only early supporter invite
```
