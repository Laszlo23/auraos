# AURA T-0 attach + Sunday desk paper

Print this. T-0 is **Sunday 13 Sep 2026, 11:11 Europe/Vienna**. Money is funded. This page is the click order.

Treasury (inbound only until the bell): `0x7894a4f43cec1E97CBAa9Cd6676Ac07ABF34dD49`  
USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`  
Team vesting Safe (not the $6k book): `0x96E85b3560C6959783c158B39672206afB6365ac`

There is **no** in-repo script that attaches the pool. `src/lib/aura-t0-clanker.ts` builds the spec only.

## Numbers to type (do not invent others)

| Field | Value |
| --- | --- |
| Pair | AURA / **USDC** on Base (8453) |
| Book USDC | **6,000** |
| Official seed (dev buy) | **1,111** USDC into that book |
| LP AURA | **46,666,667** (18M near ~$0.001, 27,666,667 drip, 1M far) |
| Start | ~**$0.001** FlatStart — Clanker preset **Standard**, never Project |
| Fees | **Dynamic3** 1–3% (100–300 bps) |
| Sniper decay | **15 seconds** only |
| Swap burn | **15 bps** AURA-side |
| Fee split | **50 / 25 / 15 / 10** — LP stakers / protocol sink / burn / quest |
| Official token | **AuraToken.sol** from `broadcast --go` |
| Forbidden | `ClankerTokenV4`, company Launch Desk, a second CA |

Copy recipient addresses from the **broadcast receipt** (burn sink, gauge, protocol sink, quest). Not from a guess.

## Path A — Clanker wrap (preferred if the UI allows it)

Do this **after** `broadcast --go` confirms AuraToken. **Before** any public CA.

1. Open Clanker on **Base**. Not the Aura company Launch Desk.
2. Choose **existing / wrap token**. Look for `existingToken: true`.  
   If the only button is “Create token” / factory deploy → **stop. Use Path B.**
3. Paste the **confirmed** AuraToken from the receipt.  
   Predicted `.aura-t0-predicted.json` is a check only. If they differ, the receipt wins.
4. Quote token: USDC `0x8335…2913`. Not WETH. Not ETH.
5. Positions: **Standard**. If you see Project / moon stairs → back out.
6. Book: **6,000 USDC**. Bands: 18M near $0.001–$0.0035, drip $0.0035–$0.02, far $0.02–$0.08.
7. Fees: Dynamic3. Sniper 15s. Burn 15 bps. Rewards 5000 / 2500 / 1500 / 1000 to the receipt addresses.
8. Dev buy: **1,111 USDC**, recipient = launch treasury `0x7894…`.
9. Lock: permanent / no team withdraw. If “owner can remove LP” is on → **stop**.
10. Sign from `0x7894…` on this machine. First outbound txs after deploy are attach + seed — that is intended.
11. Wait for the pool tx. Write down the pool / hook / lock addresses.

## Path B — native Uni v4 (if Clanker will not wrap)

Same numbers. Same lock. Never mint a factory AURA.

1. Uniswap v4 Position Manager on Base.
2. Initialize **AURA/USDC** at ~$0.001. Hook = published Dynamic3 + 15 bps burn if we have it; otherwise the published lock still must be non-withdrawable.
3. Add the three FlatStart bands with **6,000 USDC + 46,666,667 AURA**.
4. Transfer the position NFT into the **published locker**. Confirm the team cannot `decreaseLiquidity` / collect principal.
5. Swap **1,111 USDC** into the book (the seed). Bought AURA stays on `0x7894…`.
6. Record pool id + locker. Same fee-split recipients as Path A, via the gauge / sinks from the receipt.

## Slip rule

If Path A wants a new factory token **and** Path B is not clear on paper at 11:11:

- Do **not** `broadcast --go` (or do not publish if already deployed).
- Keep Sunday 11:11 as marketing only.
- Public note on X + `/trust`. Never a live CA with `pair: null`.
- Never “just use ClankerTokenV4”.

## Sunday 10:45 → pin (bell)

```text
status green → wait → broadcast --go → attach lock + $1,111 seed
→ verify pool non-withdrawable → post-t0 → pin CA
```

```bash
# 10:45 — dedicated machine, never VPS
export AURA_WALLET_TEAM_BENEFICIARY=0x96E85b3560C6959783c158B39672206afB6365ac
npx tsx scripts/aura-t0-operator.ts status
# expect: USDC OK · ETH OK · nonce 0 OK

# 11:10
npx tsx scripts/aura-t0-operator.ts wait

# 11:11 — only after GO
npx tsx scripts/aura-t0-operator.ts broadcast --go
# copy confirmed AuraToken from the receipt

# attach Path A or Path B (this page) before any public CA

npx tsx scripts/aura-t0-operator.ts post-t0
# then VPS: AURA_CA_PUBLISH=1 + confirmed CAs (never AURA_ALLOW_PRE_T0_CA)
# bash scripts/deploy-app.sh
# curl -sS https://aibusiness.fun/api/token/aura
# pin the same CA on X @bihary41418 — never DM
```

Print the same text without opening this file:

```bash
npx tsx scripts/aura-t0-operator.ts desk
```

## Do not

- Send any tx from `0x7894…` **before** `broadcast --go`.
- Put `AURA_T0_KEY` on the VPS.
- Publish a predicted CA.
- Use the old pAURA sink `0x502c…` as treasury.
- Approve or touch spam `EṬH` tokens on the launch wallet.
