# Phase 4 sketches — DO NOT DEPLOY

Solidity in this folder is **design reference only** for the Robinhood wrapper rail.

| File | Intended chain | Role |
| --- | --- | --- |
| `AuraRhLockbox.sol` | Base | Lock canonical AURA |
| `AuraRhWrapper.sol` | Robinhood `4663` | Mint/burn `wAURA` |

Human spec: [`docs/AURA_RH_WRAPPER.md`](../../../docs/AURA_RH_WRAPPER.md)  
Liquidity gate: [`docs/AURA_BASE_LIQUIDITY_PLAN.md`](../../../docs/AURA_BASE_LIQUIDITY_PLAN.md)

## Rules

- Do **not** add these to `scripts/aura-t0.ts` / operator broadcast
- Do **not** set `AURA_TOKEN_CA` to the wrapper
- Do **not** publish addresses until the Base liquidity gate is green and a 48h announce has started
- Move out of `sketch/` only after review + rename + deploy runbook

Compile locally only if you are iterating on the sketch:

```bash
# optional — not part of CI / T-0
# forge build --contracts contracts/aura/sketch   # if forge layout is added later
```
