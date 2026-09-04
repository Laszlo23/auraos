# AURA WORLD — build status (internal SSOT)

Living map of the AURA WORLD pillars vs what ships in this repo. See also the roadmap audit plan in `.cursor/plans/`.

## Pillars

| Pillar | Status | Key paths |
|--------|--------|-----------|
| **AURA OS** | Live | `src/routes/_authenticated/console.tsx`, missions, agents |
| **AURA LOCAL** | MVP live | `/lokal`, `/heute`, `/kunden`, `docs/GO_TO_MARKET_LOKAL.md` |
| **AURA VIENNA / Nachbar** | Live | `/wien`, `/nachbar/*` |
| **AURA QUEST** | **Live (Phase A)** | `/quest`, `src/lib/progress/`, `award_progress` RPC |
| **AURA Community Squads** | **Live** | `/community`, typed growth tasks (social / Spaces / scout), world pulse |
| **Growth digital work** | **Live** | Assignable human tasks on squads → Quest `growth:*` XP/REP; templates in `growth-digital-work.ts` |
| **Beta readiness** | **Live** | Loving one-step Console; funnel `app_events`; Desk $12k prophecy; cohort script `docs/BETA_COHORT.md` |
| **Public momentum** | Live | `/changelog` (2026-09-02), share kit `quest-squads`, roadmap vibes include Quest + Squads |
| **AURA SCOUTS** | **Live (Vienna)** | `join_aura_scout`, Scout invite `/lokal?ref=`, `attribute_scout_business`, leaderboard |
| **AURA PORTALS** | MVP | `/portal/$slug`, `aura_portals` table |
| **AURA STREET** | Brewing | Extend `/nachbar/entdecken` — map mode Phase D |
| **Genesis / Hood** | Partial on-chain | Cap **1,000** Hood; Genesis **777** = profile tier (`src/lib/progress/genesis.ts`) |
| **Token investor hub** | **Live** | `/token` — buy pAURA, early giveback, CA trust, RH peg; wallet strip; no OS required |
| **NFT desk playbook** | **Live** | `/token#nft-desk` + `nft-desk-playbook.ts` — transparent strategies; OpenSea metadata compat (`/api/genesis/collection`); Quant Peg/Founding presets; **no** share-NFT / flip bot |
| **Web3 T-0** | Phase E | Audit before deploy; hold-to-earn **not live** (`holder-perks.ts` `active: false`) |

## Progress SSOT (Phase A)

- **Tables:** `user_progress`, `progress_events`, `achievement_definitions`, `user_achievements`
- **RPC:** `award_progress(event_key, xp, rep, company_id?, idempotency_key?, meta?)`
- **Client:** `src/lib/progress/award.ts`, `src/hooks/use-user-progress.ts`
- **Quest registry:** `src/lib/progress/registry.ts` (replaces scattered quest arrays over time)
- **Company XP:** `useAwardXp` → server RPC (no more client-only `founder_progress` writes for quests)

## REP naming

| Term | Meaning |
|------|---------|
| **REP** (`user_progress.rep`) | Contribution currency — verified events only |
| **`companies.reputation`** | Ops score 0–100 (unchanged) |
| **Aura Reputation** (i18n `localProduct.reputationName`) | Local SaaS product €49/mo — not contribution REP |

## Genesis policy

- On-chain Hood supply: **1,000** (immutable)
- **Genesis 777**: profile tier for tokenIds 1–777 + early contributors — does not change contract cap
- `genesis_number` on `user_progress` links Hood mint to tier

## Scouts (Phase B)

- `aura_scouts` + `scout_attributions`
- After Join Scouts: copyable `/lokal?ref=<code>` invite (founding invite or `ensure_scout_referral_code`)
- Signup with that ref → `attribute_referral` → Local seat paid → `attribute_scout_business` → REP + Connector badge
- Vienna leaderboard: `vienna_city_leaderboard` RPC on `/leaderboard`

## Quest social loop

- Community `/community` awards `community:follow-*` / join Discord/Telegram on honor-system click (idempotent)
- `/quest` merges signup Growth Starter XP on mount via `merge_signup_growth_progress`
- Success metric: 3 quests → level + badge without tokenomics

## Portals (Phase C)

- Public URL: `/portal/$slug`
- Auto-created when local listing publishes (`publishLocalListing`)
- Optional GPS on `nachbar_checkins.lat/lng`
- Discover moment: `discover_aura_portal` + check-in confirm awards

## Web3 / trust (Phase E)

Before AURA T-0:

1. External audit on Hood + launch bundle (`contracts/launch/`, `contracts/aura/`)
2. Hold-to-earn: implement fee-split contract **or** keep marketing honest (currently **coming at T-0**)
3. Publish CA only via `src/lib/site.ts` trust lines
4. No second founding collection

## Success metric (30-day slice)

New user completes 3 quests, sees level + 1 badge on `/quest`, without tokenomics on day one.
