# Recommended Connect integration — Aura OS

## Recommended Connect integration

**Platform prerequisite:** Activate Connect on the Aura Stripe account first:
https://dashboard.stripe.com/settings/connect/platform-setup
Without this, create-account calls fail with “signed up for Connect” / Accounts v2 blocked.

### A. Account configuration
Accounts API: `/v2/core/accounts` (preferred), with automatic fallback to `/v1/accounts`
controller properties matching Standard (full Dashboard, fees on connected account, losses on Stripe).
Legacy account `type`: not used when controller properties succeed.
Dashboard: full  
Fee collection: Stripe bills connected accounts (`fees_collector: "stripe"` / `controller.fees.payer=account`)  
Negative balance liability: Stripe (`losses_collector: "stripe"` / `controller.losses.payments=stripe`)

Founders sell under their own brand on `/s/$slug`. They are merchant of record for customer subscriptions and one-time products. Aura already monetizes via founding seats on the platform Stripe account.

Each connected account needs merchant configuration (`configuration.merchant`) for direct charges.

### B. Charge pattern: direct
Checkout Sessions are created with the `Stripe-Account` header set to the founder’s connected account. Customers pay the founder; Aura does not sit in the funds path for site sales. Platform founding-seat checkout stays on Aura’s own Stripe account (unchanged).

### C. Founder onboarding flow
Onboarding method: Stripe-hosted Account Links (merchant configuration)  
Fastest path to charges_enabled without building full remediation UI. Embedded components (`account_onboarding`, `notification_banner`, `account_management`) can be added later for in-app polish.

Flow: create v2 account → Account Link → Stripe KYC → return to Aura → refresh capability status → only then allow site Checkout.

### D. Payments dashboard access for founders
Connected accounts log in at `dashboard.stripe.com` (full Dashboard). Aura links “Open Stripe Dashboard” after onboarding.

### E. Embedded components
Recommended later: `account_onboarding`, `notification_banner` (required for health), `account_management`, `payments`, `payouts`.

### F. Webhook integration
Platform webhook must listen to events on Connected accounts. Verify signatures. Gate selling on `configuration.merchant.capabilities.card_payments.status === 'active'`.

### G. Onboarding status gating
Before site Checkout: require stored `charges_ready` refreshed from merchant card_payments capability.

### H. Fee structure
- Platform fee model: recurring SaaS / founding seat only (no `application_fee_amount` on founder sales in v1)
- Founders pay Stripe processing fees directly ([stripe.com/pricing](https://stripe.com/pricing))

```
Customer pays $X for founder product
        │
        ▼
┌──────────────────┐
│ Founder Connect  │ ─── receives $X minus Stripe fees
│ (direct charge)  │
└──────────────────┘

Aura founding seat stays on platform Stripe (separate).
```

### I. SaaS monetization
Recurring / one-time platform fees via existing Aura Checkout (founding seat, boosts). No Connect `application_fee_amount` on founder sales yet.

### J. Implementation plan
1. Persist `company_stripe_accounts`
2. Create v2 merchant accounts + Account Links
3. Direct-charge site Checkout + create Price on connected account
4. Webhooks + readiness gating
5. Billing + Website UI

### K. Risk and liability
- Negative balance liability owner: Stripe
- Risk controls owner: Stripe (Radar on connected accounts)

### L. Why this fits
- Founders own the customer relationship and statement descriptor
- Matches SaaS / store-enabler pattern (Shopify-like)
- Aura keeps platform billing separate and simple

### M. Open questions
- Default identity country (env `STRIPE_CONNECT_DEFAULT_COUNTRY`, default `AT`)
- Optional future platform take-rate via `application_fee_amount`
