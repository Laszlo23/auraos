# Stripe checklist

Generated: 2026-08-10T20:53:10.181Z

## API session smoke (no card charge)

| Flow                            | Status | Session / error                                                                  |
| ------------------------------- | ------ | -------------------------------------------------------------------------------- |
| founding_seat                   | PASS   | `cs_live_a1Tn8yJv6Lx64OCGGJ6RqWkpOE4gXA2SWt9T2WIBKMAwZVURGgA35gVn9Y` · 9900usd   |
| local_seat/local_seat           | PASS   | `cs_live_a114Wv7sT1CmepNAFTPthhlxu7VQ7NBL4Q35Nnri7iLzkWrlCnrb5s2PA8` · 9900eur   |
| boost_pack/sichtbarkeit         | PASS   | `cs_live_a1T6dhng8ziseyqWZZWNZCD3EmPCE0xG7y3AagQLES5ZjvI2QCrfnyaJfL` · 4900eur   |
| boost_pack/bewertungen          | PASS   | `cs_live_a1Pqr1CVuj9gpiYlCCzQOlEFJRtc9ajMuoCBsjVxzhFHAvb2OW3JGRtz0I` · 7900eur   |
| boost_pack/neukunden            | PASS   | `cs_live_a1b0EYSmWUoBY4aKBgAKl1rbhdRnXjOfgvofGY7YnxIPM4p1kwsTDo4e4t` · 9900eur   |
| aura_plan/starter               | PASS   | `cs_live_a1yfpswva0dHxlSTcvJBOkDSMXofGlRgleY8Nsrq65Tr6HsZDGV7LMjzjV` · 12000usd  |
| aura_plan/company               | PASS   | `cs_live_a1n0TDvciZq1HOVJQ6ROTe5yldpsLalHuPoy0I4D7apMHPIhXe46VyOctK` · 40000usd  |
| aura_plan/scale                 | PASS   | `cs_live_a1N48hONtQrvqMUxTzeCoWwhvMRrDyZdYcYottYIL1d8yXye3YoypVSEl0` · 110000usd |
| funnel_plan/outcome_starter     | PASS   | `cs_live_a17FPPkKexPIMC9bagOUT4X0G1mXUx3diqnSsPYXAycA3rKHb0WyWrxrJo` · 29900eur  |
| funnel_plan/outcome_growth      | PASS   | `cs_live_a1RWyJRrcpG7CUu6C1LhqmA3q1fM5QNVkIxFu4gI5sKPifNHaiG1ynMI18` · 69900eur  |
| funnel_plan/outcome_performance | PASS   | `cs_live_a13apl5XF8TOJjgSQgjoFNRfolZfyqBhqbR6kMXAGN65AocuHTKbUEwSBX` · 149900eur |
| funnel_plan/bib_setup           | PASS   | `cs_live_a1e11JWScaZV7uHyV44i1zoSSKfeRkjFlyZViwfrtGmeXXijttXaopITDr` · 49900eur  |
| funnel_plan/bib_operate_starter | PASS   | `cs_live_a14evj44n7Re5fALKDYXHaIvHc7Ti8NVHMK1Sa1OHrfDPqyo3jqDGSDuLm` · 4900eur   |
| genesis_nft                     | PASS   | `cs_live_a182hAnWbQldW29OAPwbJVxZQQVE6hZeRRFRRnNqQ3jjJuw3eA6FU8kfoN` · 9900usd   |
| site_demo                       | PASS   | `cs_live_a1HH2CQtCYtBHqiXTs0FHq72LF5O0NEORFIVI66G8ourjXAfX3gyGLfqYt` · 299eur    |
| site_demo                       | PASS   | `cs_live_a1qgeE5vFZhXqozTj9T6ZuTXn8tygbdGuafApbvNc3UTr480ZJPSdPRNrt` · 499eur    |

## Live fulfillment (manual — charge then refund)

| Flow               | Entry             | Expect                       | Done |
| ------------------ | ----------------- | ---------------------------- | ---- |
| Local Seat         | `/boost`          | `local_seat_paid_at` + boost | ☐    |
| Boost Sichtbarkeit | `/boost`          | grant + social kickoff       | ☐    |
| Founding seat      | `/access` → auth  | `grant_founding_seat`        | ☐    |
| AURA Starter       | `/billing`        | subscription + tokens        | ☐    |
| Outcome Starter    | funnel `/billing` | funnel tokens                | ☐    |
| Genesis NFT        | `/wallet`         | genesis_purchases paid       | ☐    |

Webhook: `https://aibusiness.fun/api/billing/webhook` · event `checkout.session.completed`.

Smoke summary: 16/16 passed (Managed Payments + `Stripe-Version: 2025-03-31.basil`).

## Managed Payments

All Checkout Sessions use `src/lib/stripe-checkout.ts`:

- Header `Stripe-Version: 2025-03-31.basil`
- `managed_payments[enabled]=true` (disable with `STRIPE_MANAGED_PAYMENTS=0`)
- No `payment_method_types` (required by Managed Payments)

Activate Managed Payments in the [Stripe Dashboard](https://dashboard.stripe.com/settings/managed-payments) if live Checkout errors mention managed payments / tax codes.

## Ops verified (GTM readiness)

| Check                                                | Status              |
| ---------------------------------------------------- | ------------------- |
| `STRIPE_WEBHOOK_SECRET` on VPS                       | SET                 |
| `WORKER_SECRET` + cron `*/10` tick                   | SET                 |
| X OAuth (`X_CLIENT_ID`/`SECRET`)                     | SET                 |
| Meta OAuth (`META_APP_ID`)                           | SET                 |
| Idempotent plan grants (session id in ledger reason) | Code shipped        |
| Live card charge → seat grant                        | ☐ still manual once |

`FIRECRAWL_API_KEY` optional (DuckDuckGo fallback). VPS: `STRIPE_MANAGED_PAYMENTS=1`, chain envs = `base`.
