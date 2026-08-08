# Grants & credits push for aibusiness.fun

Goal: get free compute, cloud and AI credits (and where possible cash grants) from Lovable, Google, OpenAI, AWS, Microsoft, Alchemy and Base — using truthful numbers pulled from the live backend.

## Honest starting position

Stage facts you gave: self-funded, team of 4, product almost live, invite-only. Backend right now holds 19 companies, 134 agents, 98 simulated trades, 16 subscriptions, 210 teaser events, 1 handle, 1 x402 call ($0.01 USDC), 0 waitlist rows, 0 referrals — first company created 5 Aug 2026.

That means most programs' "traction" boxes are thin. The strategy is therefore: lead with the **product and architecture** (agent OS, x402 machine-payable API, on-chain settlement), not with metrics. Credit programs (Google Cloud, AWS, Microsoft, OpenAI) accept pre-traction startups; cash grants generally do not, so we target credits first.

## 1. Program list + eligibility (research deliverable)

A researched table of every relevant program with amount, requirement, deadline, apply link and a fit verdict for us. Covered:

- Lovable — credits / startup or founder programs, and Lovable badge/showcase routes
- Google for Startups Cloud Program (up to $200k Cloud + Gemini credits), Google AI/Gemini API credits
- OpenAI — startup credits, Converge / OpenAI for Startups
- AWS Activate, Microsoft for Startups Founders Hub (Azure + OpenAI credits)
- Alchemy Startup / Growth credits (we already use Alchemy RPC)
- Base / Coinbase ecosystem grants + Base Builder Rewards (we ship x402 + Base settlement — strong fit)
- Optional EU/AT: aws (Austria Wirtschaftsservice) Preseed, FFG Innovationsscheck, EIC Accelerator — cash, longer forms

Each row is marked Apply now / Apply after N users / Not eligible.

## 2. Application kit (documents)

Written once, reused across every form, saved as downloadable files:

- One-pager: what Aura OS is, the problem, why now
- Long description in 3 lengths (50 / 250 / 1000 words) — most forms ask exactly these
- Technical architecture summary: TanStack Start, Lovable Cloud, agent runtime, x402 paid-API gateway with 60/20/20 revenue split, Alchemy smart wallets, FIO handle binding
- "Why we need credits" — concrete workload estimate (inference per agent-hour, RPC calls, storage) so the ask is credible
- Team page for 4 people (placeholders for names/roles you fill in)
- Traction section that states real numbers plus honest labels for what is simulated
- Standard answers: business model, market, competition, use of funds, milestones

## 3. Traction data export

A live query pack that writes a metrics sheet (`grant-metrics.xlsx` + CSV) with: signups, founders, agents, x402 calls and USDC earned, trades, subscription tiers, teaser funnel with UTM sources, week-over-week growth. Regenerable before each application so numbers are never stale. Rows sourced from simulated/demo data are flagged as such.

## 4. Public /grants page

A new route at `/grants` in the existing dark-glass design language:

- Hero: the ask, in one line
- What we are building (reuses the plain-words explainer voice)
- Architecture diagram section
- Live traction strip pulling real numbers from the public views (same source as `/live`)
- Team of 4
- What each partner's credits unlock, with a per-program deep link
- Contact / press kit download (one-pager PDF)
- Own head() metadata, noindex off, canonical to aibusiness.fun/grants

## Technical notes

- Research runs through subagents; results land in the program table, no code impact.
- Documents generated to `/mnt/documents` (PDF one-pager, DOCX long form, XLSX metrics) and offered as downloads.
- `/grants` is a public route (not under `_authenticated`), so its live counters read the existing anonymized public views via a publishable-key server function — no protected server fn in the loader.
- No schema changes needed.

## Build order

1. Program list + eligibility research
2. Traction data export (feeds the docs)
3. Application kit documents
4. `/grants` page

If you want, I can also pre-fill each program's web form fields into a per-program answer file so applying is copy-paste only.
