# Aura Nachbar — customer (patron) app

Working name: **Aura Nachbar**.  
Audience: people who are **not** running a business — guests, regulars, neighbors who visit cohort shops, check in, refer friends, and earn a balance they can later spend or (phased) cash out toward USDC.

This is a **product design doc**. An MVP is live at `/nachbar` (tabs, check-in, ledger, friend refs). USDC cash-out and full KYC remain phased. Business shell: [Local DE shell](../src/components/aura/local-de-shell.tsx). GTM context: [GO_TO_MARKET_LOKAL.md](GO_TO_MARKET_LOKAL.md).

## Why this app exists

Review Boost already asks real customers for Google feedback via `/r/review/$token`. That path is a **302 to Google** — no identity, no wallet, no earn loop.

Nachbar closes the loop:

- Patrons get a reason to come back (balance + offers)
- Shops get verified visits and friend referrals
- The network densifies toward a self-growing local ecosystem

## Compliance

**We never pay for Google reviews or star ratings.**

Earnable actions:

- First account + link to a shop that invited you
- **Check-in** at a cohort shop (QR / staff / geofence)
- Referring a friend who completes a check-in
- Referring a **new business** that takes a Local Seat
- Optional **in-app** feedback (Aura-native), separate from Google

After check-in, UI may show a soft Google CTA:

> “Wenn es dir gefallen hat, kannst du optional Google Bescheid sagen — dafür gibt es **keine** Belohnung.”

## Look and feel

Match Aura Lokal business shell: phone-first, calm, German copy, tab bar — **not** a crypto trading dashboard.

- Brand signal: “Aura Nachbar” as hero on first open; no dense stat strips
- Typography: same display + body fonts as the Lokal shell
- Atmosphere: soft aurora / depth background already used on aibusiness.fun — not purple-gradient AI cliché cards everywhere
- Motion: short tab transitions, balance tick on earn, QR scan pulse — 2–3 intentional motions, not noise
- Default: no card grids in the hero; cards only where interaction needs a container (offer redeem, check-in confirm)

## Onboarding (3 screens)

Entry points:

- Shop invite / Review Boost link (`/r/review/$token` → Nachbar claim, then optional unpaid Google)
- Public shop card (`/b/$slug` → “Nachbar werden”)
- Friend referral deep link
- Later: App Store / PWA install from `/lokal` or a `/nachbar` landing

### Screen 1 — Welcome

- Headline: **Aura Nachbar**
- One line: “Check in bei Läden in deiner Nähe. Verdiene. Bring Freunde.”
- CTA: Weiter mit Apple / Google / Handynummer
- Fine print: no payment required to join; not an investment

### Screen 2 — Neighborhood

- City (prefill from invite)
- First shop (from invite token or search cohort shops)
- Confirm: “Das ist mein Stamm-Laden” (can add more later)

### Screen 3 — Guthaben ready

- Invisible smart-wallet provision (server-side; reuse Alchemy patterns used for founders)
- Copy: **Dein Guthaben** — never “seed phrase,” never “APY”
- Short tip: check in with the shop QR after your next visit

## Core tabs

```text
┌─────────────────────────────────────┐
│  Aura Nachbar          Wien · ···   │
│                                     │
│  (tab content)                      │
│                                     │
├─────┬─────┬─────┬─────┬─────┤
│Heute│Entd.│Verd.│Freun│ Ich │
└─────┴─────┴─────┴─────┴─────┘
```

### Heute

- Shops that invited you / upcoming offers
- Primary CTA: **Check-in scannen**
- Next best action only (one job): get to a confirmed visit

### Entdecken

- Cohort shops near you (public cards, same spirit as `/b/$slug`)
- Filter by niche (Friseur, Beauty, Gastro, …)
- Open hours / homepage link — no fake star scraping

### Verdienen

- Balance (points / AURA-Nachbar units — name TBD; keep consumer language)
- History: check-ins, referrals, redemptions
- Pending: “Warte auf Bestätigung vom Laden”
- Later: **Tausche in USDC** (phase 2) with limits

### Freunde

- Personal invite link + QR
- “Freund checkt ein → beide bekommen X”
- Status list of invited friends (joined / checked in)

### Ich

- Profile, city, notifications
- Linked shops
- Cash-out / KYC status when enabled
- Support + privacy links

## Happy path (after a haircut)

1. Guest finishes appointment at Salon Mira  
2. Scans **shop QR** on the counter (or staff taps Confirm in business Kunden)  
3. Check-in confirmed → points land on Verdienen  
4. Soft optional Google CTA (unpaid)  
5. Prompt: share Freunde link — bonus when friend checks in at any cohort shop  

## Earn rules (v1 intent)

| Action | Patron | Shop |
|---|---|---|
| Welcome + first check-in | Welcome grant | Campaign / visit metric |
| Repeat check-in (capped / week) | Small grant | Loyalty signal |
| Friend’s first check-in | Referral grant | New guest |
| Referred shop takes Local Seat | Larger grant | B2B growth |
| Redeem offer in-app | Spend balance | Foot traffic |

Velocity caps and device binding are mandatory before public earn amounts are advertised.

## Cash-out phases

### Phase A — Utility only

- Spend balance on shop perks (discount, free add-on) inside Entdecken / Heute  
- No chain withdraw in UI  

### Phase B — USDC (optional)

- Withdraw to patron smart wallet in USDC on supported chain(s)  
- Reuse treasury / chain config patterns from the founder OS (`treasury.functions`, `chain-config`) — **new** patron ledger, not company `token_ledger`  
- KYC / limits / cool-downs TBD with counsel  
- Copy must stay utility-framed: exchange of earned rewards, not speculative yield  

## Relationship to business app

| Business (Lokal) | Patron (Nachbar) |
|---|---|
| Heute / Social / Kunden / Bewertungen / Boost | Heute / Entdecken / Verdienen / Freunde / Ich |
| Sends invites, confirms visits | Receives invites, checks in, refers |
| Pays seat + Boost packs | Earns / spends / later cash-out |
| Google invite = unpaid reputation channel | Same: optional, never rewarded |

## Suggested route sketch (future build)

| Route | Role |
|---|---|
| `/nachbar` | Marketing + install |
| `/nachbar/app` | Authenticated shell + tabs |
| `/nachbar/c/$code` | Check-in claim |
| `/nachbar/ref/$code` | Friend referral |

Keep Lokal business routes (`/heute`, `/bewertungen`, …) unchanged for owners.

## Success metrics

- Check-ins per seated shop per week  
- % of Review Boost clicks that create a Nachbar account  
- Friend referral → check-in conversion  
- B2B seats attributed to patron or owner invites  
- Zero policy incidents around paid Google reviews  

## Related

- [GO_TO_MARKET_LOKAL.md](GO_TO_MARKET_LOKAL.md)  
- Root [README.md](../README.md) secrets policy  
- Existing redirect: `src/routes/r.review.$token.tsx`  
- Public card: `src/routes/b.$slug.tsx`
