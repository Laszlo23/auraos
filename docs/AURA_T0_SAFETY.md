# AURA T-0 safety lock — before Sunday 13 Sep 2026, 11:11 Vienna

Mechanical launch is still `docs/AURA_T0_RUNBOOK.md`. This page is the **do-not-screw-it-up** list. Biggest remaining risks are ops (env/key on VPS, nonce burn, wrong CA copy) and existing wallet rails — not a live AURA swap drain.

Production today must stay `address: null` on `https://aibusiness.fun/api/token/aura`. Launch treasury address may stay public.

## What the code now refuses

| Guard | What it stops |
| --- | --- |
| `auraCaPublishAllowed()` | Predicted CA in local `.env` cannot appear on `/token`, `/trust`, `/buy`, `/api/token/aura` until `AURA_CA_PUBLISH=1` **and** T-0 (or local-only `AURA_ALLOW_PRE_T0_CA=1`) |
| `deploy-app.sh` | Refuses VPS build if `AURA_T0_KEY`, `AURA_ALLOW_PRE_T0_CA`, or `AURA_CA_PUBLISH` is set before T-0. Strips unpublished CA env so Vite cannot inline it |
| `broadcast` / `aura-t0.ts` | Mainnet needs `--go`. Refuses if local clock or **Base block time** is before T-0, if nonce ≠ 0, if `AURA_T0_KEY` is missing / equals `PRIVATE_KEY` / is not the treasury file |
| Exact ERC-20 approve | OKX desk + yield/trading no longer grant `uint256.max` or `amount * 2` |
| Card packs | `AURA_BUY_PACKS_ENABLED=0` pauses Stripe. Refund copy points at `founders@aibusiness.fun` |
| UI | Treasury row says **Launch wallet — not the AURA token** |

## Do not do (now through 11:10 Sunday)

1. Do **not** copy local `.env` or `.aura-t0-treasury.json` to `/opt/auraos`.
2. Do **not** set `AURA_TOKEN_CA` / `VITE_AURA_TOKEN_CA` / `AURA_CA_PUBLISH` on the VPS until the mainnet tx + locked book are confirmed.
3. Do **not** set `AURA_ALLOW_PRE_T0_CA` anywhere except this laptop (local preview only).
4. Do **not** send any Base mainnet tx from `0x7894…` before T-0. Nonce must stay **0**.
5. Do **not** run `broadcast` without `--go`. Do **not** run `scripts/aura-t0.ts` with a skewed clock and expect it to save you — Base time is the second gate.
6. Do **not** paste Sepolia artifact addresses (`contracts/aura/Aura.sepolia.json`) into VPS env.
7. Do **not** put `AURA_T0_KEY` or `PRIVATE_KEY` on the VPS.
8. Do **not** tell anyone the predicted CREATE address. Users copy the **Launch treasury** at their own risk — it is not AURA.

## Saturday checklist (laptop, not VPS)

```bash
npx tsx scripts/aura-t0-operator.ts status          # nonce path: predict-ca; ETH + USDC
npx tsx scripts/aura-t0-operator.ts predict-ca      # writes gitignored .aura-t0-predicted.json
npx tsx scripts/aura-t0-operator.ts broadcast       # must refuse today (no --go / before T-0)
npx tsx scripts/aura-t0-operator.ts broadcast --sepolia   # rehearsal only
```

- [ ] `status` on Base: treasury funded (~$7,111 USDC + 0.02–0.05 ETH) or you **slip**
- [ ] Mainnet nonce **0** (`predict-ca` / Basescan). Any other number = predicted CA is dead
- [ ] `/opt/auraos/.env` on VPS: `AURA_TOKEN_CA`, `VITE_AURA_TOKEN_CA`, `AURA_CA_PUBLISH` empty
- [ ] `curl -sS https://aibusiness.fun/api/token/aura` → `"address":null`
- [ ] `/token` `/trust` `/buy` `/tokenomics`: AURA row **Unpublished**; treasury labeled launch wallet
- [ ] Uni v4 attach path proven, or public slip — never mint a live CA with `pair: null`
- [ ] Card-pack queue: desk `listAuraBuyOrders` — note paid/unsent. Kill switch: `AURA_BUY_PACKS_ENABLED=0`

## Sunday bell (dedicated machine)

```text
status green → wait → broadcast --go → attach locked book + $1,111 seed
→ verify pool non-withdrawable → post-t0 env + deploy → pin CA on X
```

1. Confirm Basescan nonce still **0** at 10:45.
2. `wait` then `broadcast --go`. If it refuses, **stop**. Do not “just send a tx.”
3. Copy the **confirmed** AuraToken address from the receipt — not from `.aura-t0-predicted.json` unless they match.
4. Attach locked Uni v4 AURA/USDC **before** publishing the CA.
5. On VPS only after that:

```bash
AURA_CA_PUBLISH=1
VITE_AURA_CA_PUBLISH=1
AURA_TOKEN_CA=0x…          # confirmed mainnet AuraToken
VITE_AURA_TOKEN_CA=0x…
# pool / gauge / burn / redeem / protocol sink
# AURA_LAUNCH_TREASURY stays the public wallet — not the CA
```

6. `bash scripts/deploy-app.sh` — if it refuses, the env is wrong. Fix env, do not bypass.
7. Recheck `/api/token/aura` shows the confirmed CA. Pin the same string on X `@bihary41418`. Never DM.

## After T-0 (same day)

- [ ] One test card pack refund path if anyone paid and cannot wait (`founders@aibusiness.fun`)
- [ ] Fulfill `aura_buy_orders` with status `paid` into Aura wallets
- [ ] Hood propose / 72h / `openRedeem` only after CA is on `/token` + X (`operator hood`)
- [ ] Existing Light Accounts may still have a leftover max OKX allowance from older swaps — users can revoke on Basescan. New swaps approve the exact amount only

## Local preview (this machine only)

To see a fake CA on localhost before Sunday:

```bash
AURA_ALLOW_PRE_T0_CA=1
AURA_CA_PUBLISH=1
VITE_AURA_ALLOW_PRE_T0_CA=1
VITE_AURA_CA_PUBLISH=1
AURA_TOKEN_CA=<predicted>
VITE_AURA_TOKEN_CA=<predicted>
```

Never those four flags on the VPS. `deploy-app.sh` will refuse the first two.
