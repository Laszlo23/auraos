# AURA T-0 runbook — Sunday 13 Sep 2026, 11:11 Europe/Vienna

Do **not** miss the minute. A sleep-and-click on a phone will miss it. T-0 is **Sunday 13 Sep 2026, 11:11:00 Europe/Vienna** (CEST, UTC+2 = **09:11 UTC**). Clock SSOT: `src/lib/aura-t0-clock.ts`.

**Never** put `AURA_T0_KEY` on the public VPS next to the website.

**Never** publish a CA before T-0. **Never** send 1,111 ETH. **Never** use `ClankerTokenV4` as official AURA.

## What the money actually is

| Pocket | Amount | Where |
| --- | --- | --- |
| Official seed / first buy | **$1,111 USDC** | `devBuy` → new empty launch treasury (`tokenAdmin`) |
| Starting book | **$6,000 USDC** | Locked Uni v4 **AURA/USDC** on Base (~$0.001 FlatStart) |
| Gas | ~0.02–0.05 ETH on Base | Same new wallet (deploy + pool + verify) |

Need **~$7,111 USDC + gas ETH** sitting there by Saturday, not at 11:10 Sunday. Swap ETH → USDC on Base into the new treasury. Not Laszlo’s pAURA sale key. Not a mystery contract.

Clear overview of mint vs locked LP vs buys (and planned protocol-fee → LP growth): [`docs/AURA_LP_AND_MINT.md`](./AURA_LP_AND_MINT.md).

Ticker is already `AURA` / `AURA Token`, supply `777,777,777`. Bytecode: `contracts/aura/AuraToken.sol`.

## Friday (48h announce)

Announce copy (no CA) — pin on X `@bihary41418`, Farcaster [/auraos](https://farcaster.xyz/~/channel/auraos), LinkedIn if Share is live:

```
Fair launch T-0: Sunday 13 Sep 2026, 11:11 Europe/Vienna.
Token: AURA on Base. Official book: locked Uniswap v4 AURA/USDC. Seed $1,111 USDC. Starting book $6,000 USDC.
CA will be published at T-0 only on aibusiness.fun and @bihary41418 — never by DM.
Covenant: https://aibusiness.fun/trust
```

If this post goes out **after Friday 11:11 CEST**, slip T-0 later (e.g. Sunday 14:11). Do not shrink the 48h.

Site countdown ships with this deploy. Worker queues `t0-announce-2026-09-13` as due-now X + Farcaster posts.

## New launch treasury

On a **dedicated machine** (laptop / offline box — not the VPS):

```bash
npx tsx scripts/aura-t0-operator.ts treasury
npx tsx scripts/aura-t0-operator.ts status
```

Key lands in `.aura-t0-treasury.json` (gitignored, mode 0600). The command prints the **address only**.

Live `tokenAdmin` (empty until you fund it — not a CA):

`0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49`

Fund that address on **Base**:

1. Send **0.02–0.05 ETH** for gas.
2. Swap / send **7,111 USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).
3. Confirm with `status` before Saturday rehearsal.

Optional: set `AURA_LAUNCH_TREASURY` / `VITE_AURA_LAUNCH_TREASURY` on the VPS to the **public address** (not the key) once it exists.

## Saturday rehearsal

**Hard gate:** if Uni v4 attach / Clanker `existingToken` path is not proven Saturday, **slip T-0** — do not fake Sunday. Public notice on X + `/trust`.

```bash
# Local T-0 machine only (key in .aura-t0-treasury.json — never VPS)
export AURA_WALLET_TEAM_BENEFICIARY=0x96E85b3560C6959783c158B39672206afB6365ac
npx tsx scripts/aura-t0-operator.ts status          # Base mainnet: need ~$7,111 USDC + 0.02–0.05 ETH
npx tsx scripts/aura-t0-operator.ts compile
npx tsx scripts/aura-t0-operator.ts venue
# Fund the same address on Base Sepolia first, then:
npx tsx scripts/aura-t0-operator.ts broadcast --sepolia
```

Confirm:

- [ ] Launch treasury funded on Base: **~$7,111 USDC** + **0.02–0.05 ETH** (`status` not SHORT)
- [ ] `AURA_WALLET_TEAM_BENEFICIARY` = Safe `0x96E85b…65ac` on the T-0 machine (vesting — **not** the $6k book)
- [ ] Nonce 0 on the new wallet (or a funded Sepolia twin)
- [ ] RPC warm (`BASE_SEPOLIA_RPC_URL` / `BASE_RPC_URL`)
- [ ] Clanker can wrap a **pre-deployed** ERC-20 (`existingToken: true`). If not: native Uni v4 Position Manager + published lock. Same Dynamic3 / 50-25-15-10 / 15 bps burn. **Never** fall back to `ClankerTokenV4`.
- [ ] Fee recipients planned: Gauge / **Protocol sink (POL → locked LP)** / Burn / Quest — published on `/token` at T-0
- [ ] External review of AuraToken + redeem + gauge is still unchecked in `contracts/aura/README.md`. If the v4 attach path is not proven, slip T-0 — Sunday 11:11 stays a marketing time until the path is proven.

`scripts/aura-t0.ts` compiles Solidity and distributes allocations. It **refuses Base mainnet before T-0**. It does **not** add Uni v2 LP unless you pass `--legacy-v2` (do not). T-0 venue is Uni v4.

Grow-not-extract after T-0: week-1 protocol sink → locked book SOP in [`AURA_LP_AND_MINT.md`](./AURA_LP_AND_MINT.md) §6.

## Safe path without Sepolia USDC

Testnet USDC is often hard to get. **That is OK.** Do not improvise a broken attach just to “finish” Sepolia.

**Already proven (Sepolia, ETH-only):** AuraToken + sinks + gauge + redeem + vestings + allocation transfers (`broadcast --sepolia`, exit 0). That is the Solidity path. Keep `contracts/aura/Aura.sepolia.json` as the rehearsal receipt. **Do not** publish those Sepolia CAs as official.

**Cannot fake without real USDC:** locked Uni v4 FlatStart book + $1,111 seed. There is no in-repo script that attaches the pool; Clanker wrap / native Position Manager is a **manual** step with **mainnet** USDC on the launch treasury.

**Safe Sunday rule (do not violate):**

1. Mainnet treasury `status` must show ~**$7,111 USDC** + **0.02–0.05 ETH** — not SHORT.
2. Operator at the desk knows the exact attach sequence. Printable click order: [`docs/AURA_T0_ATTACH.md`](./AURA_T0_ATTACH.md) (`npx tsx scripts/aura-t0-operator.ts desk`).
3. At T-0: deploy token stack **first** → attach **locked** book **before** any public CA → only then `post-t0` + pin on X.
4. If step 2 is unclear Saturday night → **slip mechanical T-0**. Keep the announced time as marketing only. Public note on X + `/trust`. Never mint a live CA with `pair: null`.
5. Never put `AURA_T0_KEY` on the VPS. Never use `ClankerTokenV4`. Never shrink the 48h announce.

**Smooth order on the bell:** `status` green → `wait` → `broadcast --go` (mainnet) → attach lock + seed → verify pool non-withdrawable → `post-t0` → pin CA. Human in the loop the whole way.

## Sunday 10:45–11:20 Vienna

1. **10:45** — operator at the desk. Script loaded. RPC warm. Base status green. `AURA_T0_KEY` only on this machine.
2. **11:11:00** — `npx tsx scripts/aura-t0-operator.ts wait` then `broadcast --go` (or broadcast at the bell). Human in the loop. Optional `at`/`sleep until` on this dedicated box. Mainnet refuses without `--go`, if nonce ≠ 0, or if Base block time is still before T-0.
3. Deploy **AuraToken first** (this is the official CA). Then burn sink, gauge, redeem, vestings, gift prefund.
4. Attach locked Uni v4 AURA/USDC + **$1,111 USDC seed** + **$6,000 USDC book**.
5. **11:12–11:20** — `npx tsx scripts/aura-t0-operator.ts post-t0`
   - Set `AURA_CA_PUBLISH=1` + `VITE_AURA_CA_PUBLISH=1` + `AURA_TOKEN_CA` + pool + gauge + burn sink + launch treasury **address** on the VPS. Never `AURA_ALLOW_PRE_T0_CA`. Never Sepolia CAs. Never the predicted address until the tx is confirmed.
   - Deploy the app
   - Pin CA on X `@bihary41418`
   - DexScreener token info from `/api/token/aura`
   - GoPlus **after** the 15s sniper fee decays

Printable pre-Sunday lock: [`docs/AURA_T0_SAFETY.md`](./AURA_T0_SAFETY.md). Attach + 10:45 bell: [`docs/AURA_T0_ATTACH.md`](./AURA_T0_ATTACH.md).

There is no “deposit ETH and Clanker fires at 11:11 by itself.” `src/lib/aura-t0-clanker.ts` **builds the spec only**.

## Hood follow-through (second clock)

This is **not** the $1,111 seed.

```bash
npx tsx scripts/aura-t0-operator.ts hood
```

1. Prefund the gift drop with `7,777 × minted Hoods` AURA (plus dust plan) **before** `executeMarket`.
2. After the CA is public, guardian **proposes** the official pair (`proposeV2Market` or `proposeAdapter` for v4).
3. **72h timelock**, then anyone `executeMarket()`. Escrowed USDC buys AURA into the gift drop.
4. Owner `openRedeem()` on `AuraPauraRedeem` **only after** the CA is on `/token` + X.
5. Hood holders `claim(tokenId)` — unlocked AURA in wallet.

## Honest risk

If AuraToken + redeem + gauge are not externally reviewed, and/or the v4 attach path is not proven Saturday, announce the **time** (done) and slip the mechanical T-0. Do not shrink 48h. Do not invent a CA.
