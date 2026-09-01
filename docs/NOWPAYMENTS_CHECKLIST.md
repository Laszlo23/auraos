# NOWPayments go-live checklist (Local Seat crypto)

Fixed-price product: **€99 Local Seat** (USDC / ETH / BTC / SOL).
IPN: `https://aibusiness.fun/api/billing/crypto-ipn`

Dashboard: [NOWPayments Settings → Payments](https://account.nowpayments.io/settings)

| #   | Item                                                    | Status              | Notes                                                                                                                             |
| --- | ------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | API key generated                                       | **Done**            | `NOWPAYMENTS_API_KEY` on VPS. `GET /v1/status` → OK. Estimate 99 EUR → USDC works.                                                |
| 2   | Custody enabled, if applicable                          | **N/A**             | We take invoices, not API mass-payouts. Enable Custody in the dashboard only if you want NOW to hold/convert before you withdraw. |
| 3   | IP addresses whitelisted, if applicable (NOW dashboard) | **N/A / optional**  | Required only for **payout API**. Invoice create does not need it. If you turn payout IP-lock on, whitelist VPS `186.240.156.50`. |
| 4   | Wallet(s) whitelisted, if applicable                    | **Do in dashboard** | Whitelist the Base treasury `0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1` before any withdrawal.                                   |
| 5   | Network fees settings specified, if applicable          | **Do in dashboard** | Settings → Payments → Network Fee Optimization: on (picks the cheapest wallet/route).                                             |
| 6   | Base currency set                                       | **Done in API**     | Invoices send `price_currency: eur`. Set dashboard base currency to **EUR** to match.                                             |
| 7   | IPN secret key generated                                | **Done**            | `NOWPAYMENTS_IPN_SECRET` on VPS (not the API key). HMAC-SHA512 of sorted JSON.                                                    |
| 8   | NOWPayments IP addresses whitelisted                    | **Done**            | Caddy allows IPN only from `51.89.194.21`, `51.75.77.69`, `138.201.172.58`, `65.21.158.36`. UFW already allows 80/443.            |
| 9   | IPN set up                                              | **Done**            | `ipn_callback_url` on every invoice. Endpoint is public POST (no session auth). Must answer within 3s.                            |
| 10  | System checks `outcome_amount` and `outcome_currency`   | **Done**            | Seat is granted only if status is `finished` **and** outcome fields cover €99. Underpay / missing outcome → 400, no seat.         |
| 11  | Default payment status for repeated payments set        | **Do in dashboard** | Payment details → Repeated payments: **Partially Paid**. Wrong-asset deposits: **Partially Paid**. (Fixed-price, not a top-up.)   |
| 12  | Additional features enabled, if applicable              | **Recommended**     | Payment covering ~99%. Do not auto-finish partials.                                                                               |
| 13  | Payments and IPN tests completed                        | **Automated**       | Unit tests for HMAC + outcome. Live API status/estimate. Unsigned IPN from the public internet is 403 (not a NOW IP).             |

## Code rules (fixed-price)

- Deliver **only** on `payment_status === "finished"`.
- Never grant on `confirming`, `confirmed`, `sending`, or `partially_paid`.
- Require `outcome_amount > 0` and a non-empty `outcome_currency`.
- Billed `price_amount` / `price_currency` must be ~€99.

## Env (VPS `.env`, never `VITE_*`)

```
NOWPAYMENTS_API_KEY=
NOWPAYMENTS_IPN_SECRET=
# optional alias:
NOWPAYMENTS_SECRET_KEY=
```

Smoke: `npx tsx scripts/nowpayments-go-live.ts` (needs the API key in env).
