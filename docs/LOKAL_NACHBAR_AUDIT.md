# Lokal + Nachbar ecosystem — audit (2026-08-16)

## Happy paths (working)

1. **Business:** `/lokal` → signup (`funnel=local`) → onboarding → `/boost` unlock (49€/mo · cash code · 99€ once) → `/bewertungen` Google link + invites → copy `/r/review/$token` → guest bridge → `/kunden` QR confirm.
2. **Guest:** `/nachbar` or `/nachbar/c/$code` or Review bridge → `/auth?next=/nachbar/heute` (no founding seat) → check-in pending → owner confirms → points.
3. **Friend ref:** `/nachbar/ref/$code` stores friend code → auth as Nachbar patron → activation on confirmed check-in.

## Fixes landed this pass

| Area                    | Change                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Auth                    | Nachbar `next=/nachbar*` skips $99 founding seat; DE copy; magic-link keeps `next` |
| Boost                   | `?checkout=success\|cancel` toast + poll; 3-path pricing clarity; next-step CTAs   |
| Sterne                  | Send how-to + guest-flow explainer; copy link marks sent                           |
| Gäste                   | Empty QR states; copy link; pending confirm hint                                   |
| Heute                   | Done state → Guthaben (aligned copy)                                               |
| Review bridge / Nachbar | Soft Google CTA (muted, not gold); first-visit “So geht’s”; pending Tresen panel   |
| Docs                    | `CUSTOMER_APP.md` + GTM Review Boost bridge reality                                |

## Remaining backlog (not blocking MVP)

- Perk redeem / spend loop for Nachbar points
- True QR decode + geofence / device binding
- `/social` in-shell drafts (still deep-links to OS connect)
- Claim-token expiry + stricter ownership race lock
- Self-host QR images (drop api.qrserver.com)
- Dual English `/business` surface for local owners (hide or redirect)

## Compliance

Google reviews: invite only; no points for stars; CTA secondary + muted styling.
