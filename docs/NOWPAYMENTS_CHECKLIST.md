# NOWPayments go-live checklist (Local Seat crypto + donations)

Fixed-price product: **€99 Local Seat** (USDC / ETH / BTC / SOL).
Open donations: **`/donate`** → `POST /api/billing/donate` → NOWPayments `/v1/invoice` (USD presets).
IPN: `https://aibusiness.fun/api/billing/crypto-ipn`

Dashboard: [NOWPayments Settings → Payments](https://account.nowpayments.io/settings)

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | API key generated | **Done** | `NOWPAYMENTS_API_KEY` on VPS. `GET /v1/status` → OK. Estimate 99 EUR → USDC works. |
| 2 | Custody enabled, if applicable | **N/A** | We take invoices, not API mass-payouts. Enable Custody in the dashboard only if you want NOW to hold/convert before you withdraw. |
| 3 | IP addresses whitelisted, if applicable (NOW dashboard) | **N/A / optional** | Required only for **payout API**. Invoice create does not need it. If you turn payout IP-lock on, whitelist VPS `186.240.156.50`. |
| 4 | Wallet(s) whitelisted, if applicable | **Do in dashboard** | Whitelist the Base treasury `0xAC55a8674398BF050F21940EE0bB2d18BC393114` before any withdrawal. |
| 5 | Network fees settings specified, if applicable | **Do in dashboard** | Settings → Payments → Network Fee Optimization: on (picks the cheapest wallet/route). |
| 6 | Base currency set | **Done in API** | Local Seat invoices send `price_currency: eur`. Donations send `usd`. Set dashboard base currency to match your primary product (EUR). |
| 7 | IPN secret key generated | **Done** | `NOWPAYMENTS_IPN_SECRET` on VPS (not the API key). HMAC-SHA512 of sorted JSON. Locally `NOWPAYMENTS_SECRET_KEY` is accepted as alias. |
| 8 | NOWPayments IP addresses whitelisted | **Done** | Caddy allows IPN only from `51.89.194.21`, `51.75.77.69`, `138.201.172.58`, `65.21.158.36`. UFW already allows 80/443. |
| 9 | IPN set up | **Done** | `ipn_callback_url` on every invoice. Endpoint is public POST (no session auth). Must answer within 3s. Donation `order_id` prefix `donate_` is acknowledged without seat grant. |
| 10 | System checks `outcome_amount` and `outcome_currency` | **Done** | Seat is granted only if status is `finished` **and** outcome fields cover €99 / founding USD. Underpay / missing outcome → 400, no seat. |
| 11 | Default payment status for repeated payments set | **Do in dashboard** | Payment details → Repeated payments: **Partially Paid**. Wrong-asset deposits: **Partially Paid**. (Fixed-price, not a top-up.) |
| 12 | Additional features enabled, if applicable | **Recommended** | Payment covering ~99%. Do not auto-finish partials. |
| 13 | Payments and IPN tests completed | **Automated** | Unit tests for HMAC + outcome. Live API status/estimate. Unsigned IPN from the public internet is 403 (not a NOW IP). |
| 14 | Footer donate button | **Done** | Links to `/donate` (server invoice). Do **not** hardcode a public donation `api_key` in the client. |

## Code rules (fixed-price)

- Deliver **only** on `payment_status === "finished"`.
- Never grant on `confirming`, `confirmed`, `sending`, or `partially_paid`.
- Require `outcome_amount > 0` and a non-empty `outcome_currency`.
- Billed `price_amount` / `price_currency` must be ~€99 (Local) or founding USD.
- Prefer **`POST /v1/invoice`** (hosted `invoice_url`) over raw `/v1/payment` for browser checkouts.

## Donation payload (server)

```json
{
  "price_amount": 25,
  "price_currency": "usd",
  "order_id": "donate_<uuid>",
  "order_description": "Aura OS donation · $25",
  "ipn_callback_url": "https://aibusiness.fun/api/billing/crypto-ipn",
  "success_url": "https://aibusiness.fun/donate?status=success",
  "cancel_url": "https://aibusiness.fun/donate?status=cancel",
  "is_fixed_rate": false
}
```

`pay_currency` is omitted so the payer picks the asset on NOW’s page.

## Env (VPS `.env`, never `VITE_*`)

```
NOWPAYMENTS_API_KEY=
NOWPAYMENTS_IPN_SECRET=
# optional alias:
NOWPAYMENTS_SECRET_KEY=
```

Smoke: `npx tsx scripts/nowpayments-go-live.ts` (needs the API key in env).
