# Stripe checklist

Generated: 2026-08-10T20:35:34.077Z

## API session smoke (no card charge)

| Flow | Status | Session / error |
|------|--------|-----------------|
| founding_seat | PASS | `cs_live_a1KeZaZx9bCy3YlRomHCiyGuVgAq9YVCZ35VdeGxEGawGM4v3thrXwMDM1` · 9900usd |
| local_seat/local_seat | PASS | `cs_live_a1QTPxQKBHEyhvP6JCwcgiYeTjvn3LUdVnhCfWBx7pIL5skh3buJbCoPni` · 9900eur |
| boost_pack/sichtbarkeit | PASS | `cs_live_a13cIhUMzXNwG8dmTaOp8NsXWVibCc08nxek69Nv13L9TekR0WfYvNWVdv` · 4900eur |
| boost_pack/bewertungen | PASS | `cs_live_a1A7qhx8r6eLnfLeeHh7CdUGHD6bWMZpcPPe8yGYXoIjiAv8H15aAaDtXp` · 7900eur |
| boost_pack/neukunden | PASS | `cs_live_a1qHIFIRzUbMRl1hZClxMdv0YOowRuzQuA75DkrS0ojQnxzhcYTSzlpeDG` · 9900eur |
| aura_plan/starter | PASS | `cs_live_a1sA6XDW5cvtuUDuMFHeX4Aqr4TIu7duDiEFthKrejm34gYbb48Xx643bD` · 12000usd |
| aura_plan/company | PASS | `cs_live_a1a3oLUdUT9FQjASoNqSISkpS026PtyUIXvQo7MjomMGhfyRvs014nbbKx` · 40000usd |
| aura_plan/scale | PASS | `cs_live_a1gGHSzFSdlJD4NSigkv2iQWec6wlugu9OK3bbFG5Vt9El4B7ZEMlvbOaZ` · 110000usd |
| funnel_plan/outcome_starter | PASS | `cs_live_a1gIB1beU6d5i45XqygNeVmxPV9so2VebaXkMRveKKNuYRjioZcRVH2zak` · 29900eur |
| funnel_plan/outcome_growth | PASS | `cs_live_a1mPDJ2QJgbJyha9MckfwtRUC34Y6L84jNz4DYmFzOIHp0BQftmg4WJHCi` · 69900eur |
| funnel_plan/outcome_performance | PASS | `cs_live_a1zaN1yKcWVhfBzmrPsELxQ4lFH9rL5LmacOIr9Iwgxqn7ajbW7hiUl3ql` · 149900eur |
| funnel_plan/bib_setup | PASS | `cs_live_a1XlEonaTL7SBxgfsgam1oN2BjvXWxsYOM4dErygh8J9qlEATJhyi6lWLS` · 49900eur |
| funnel_plan/bib_operate_starter | PASS | `cs_live_a1G6kf8KxXp2lXDO0Bwd44SCm3dt54vhfvvtfk88LJp9u4mA8x8pNPcCFO` · 4900eur |
| genesis_nft | PASS | `cs_live_a12fJLEJvzT0aRFabpAUZdRUahF35hqI1V244BTRslQGR1ugrGsHUeqrw2` · 9900usd |
| site_demo | PASS | `cs_live_a1BosGvHgMxqYwyETwcaW2ak0DVXB4Wdjy7Q6C0BWOH1YMNf6Vd5N4sXbr` · 299eur |
| site_demo | PASS | `cs_live_a1FaStR18IOnXGIl6TMMlRpZMMKnqPPn7DswIylQ7QeeVV8fYsQ3M3sTGL` · 499eur |

## Live fulfillment (manual — charge then refund)

| Flow | Entry | Expect | Done |
|------|-------|--------|------|
| Local Seat | `/boost` | `local_seat_paid_at` + boost | ☐ |
| Boost Sichtbarkeit | `/boost` | grant + social kickoff | ☐ |
| Founding seat | `/access` → auth | `grant_founding_seat` | ☐ |
| AURA Starter | `/billing` | subscription + tokens | ☐ |
| Outcome Starter | funnel `/billing` | funnel tokens | ☐ |
| Genesis NFT | `/wallet` | genesis_purchases paid | ☐ |

Webhook: `https://aibusiness.fun/api/billing/webhook` · event `checkout.session.completed`.

Smoke summary: 16/16 passed (Managed Payments + `Stripe-Version: 2025-03-31.basil`).

## Managed Payments

All Checkout Sessions use `src/lib/stripe-checkout.ts`:
- Header `Stripe-Version: 2025-03-31.basil`
- `managed_payments[enabled]=true` (disable with `STRIPE_MANAGED_PAYMENTS=0`)
- No `payment_method_types` (required by Managed Payments)

Activate Managed Payments in the [Stripe Dashboard](https://dashboard.stripe.com/settings/managed-payments) if live Checkout errors mention managed payments / tax codes.
