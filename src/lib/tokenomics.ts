/**
 * Canonical narrative for tokenomics / lightpaper / OS product addendum.
 * Market-token supply and allocation live in `aura-token.ts` (777,777,777 AURA).
 */

import { TOKEN_LAUNCH_DISPLAY, SITE_URL } from "@/lib/site";

export const TOKEN_DISCLAIMER =
  "Nothing here is an offer to sell securities. AURA (if and when launched) is an ecosystem utility/incentive layer. Subscriptions are the core business. Aura OS does not run on or require a BCC token. Figures marked “target” or “illustrative” are not forecasts or guarantees.";

export const TOKENOMICS = {
  oneLine:
    "Aura OS sells software subscriptions. The AURA token is an optional ecosystem layer for participation and incentives — not the product’s operating currency, and not BCC.",
  fairLaunch: {
    when: TOKEN_LAUNCH_DISPLAY,
    buy: "€3,000 strategic initial token acquisition at fair launch",
    agents: "€3,000 distributed across 30 independent trading / market-ops agents (~€100 each)",
    totalSeed: "€6,000 initial market operations allocation",
    volumeTarget:
      "Up to $500,000 cumulative trading volume as a target — not guaranteed. No wash trading, no self-trading, no circular trades.",
  },
  subscriptions: [
    {
      id: "starter",
      name: "Starter",
      price: "€49 / mo",
      blurb: "Founders and small businesses — one company, core AI workforce.",
    },
    {
      id: "growth",
      name: "Growth",
      price: "€149 / mo",
      blurb: "Acquisition, sales & ops employees — recommended path.",
      recommended: true,
    },
    {
      id: "autonomous",
      name: "Autonomous",
      price: "€399+ / mo",
      blurb: "Larger workforces, automation, advanced capabilities.",
    },
  ],
  utility: [
    "Ecosystem participation & status",
    "Incentives & referral rewards",
    "Community progression",
    "Selected in-app utility",
    "Agent / company economy rails",
    "Marketplace incentives",
    "Future governance functions (when shipped)",
    "Access & status layers",
  ],
  notToken: [
    "Subscriptions (core revenue)",
    "Founding seats ($99 one-time unlock)",
    "Genesis Passport NFT (utility membership key — not equity)",
    "Company compute budgets (AURA ledger for work, separate from market token narrative)",
    "BCC or any other community ticker (Aura OS does not run on BCC)",
  ],
  flywheel: [
    "Founders subscribe",
    "AI companies run missions",
    "Real customers & settled revenue",
    "More capability & companies",
    "Larger ecosystem utility for the token",
  ],
  riskControls: [
    "Max position / daily loss / slippage / inventory / exposure",
    "Kill switch · no leverage by default",
    "Founder approval gates on spend & public actions",
    "Paper vs live trading modes",
  ],
  decks: {
    investor: `${SITE_URL}/Aura_OS_Investor_Presentation.pptx`,
    tokenStrategy: `${SITE_URL}/Aura_OS_Produkt_Subscriptions_Token_Strategie.pptx`,
  },
} as const;

export const WHITEPAPER_SECTIONS = [
  {
    id: "abstract",
    title: "Abstract",
    body: `Aura OS is an operating system for autonomous companies: a founder owns the company, Atlas (CEO) orchestrates specialized AI employees, every meaningful action leaves proof-of-work, and settled economics live in a ledger that refuses vanity metrics. Software subscriptions are the business. The AURA token is an ecosystem incentive and utility layer around that product.`,
  },
  {
    id: "problem",
    title: "1. Problem",
    body: `Today the founder is the whole company — CEO, sales, marketing, research, ops, support, product, engineering, finance, social, legal, HR. Ambition is not the bottleneck; the calendar is. Every new customer creates more work until the business hits the limits of one human.`,
  },
  {
    id: "switch",
    title: "2. The switch",
    body: `From one human doing everything → one owner + an AI workforce. The owner sets mission and approvals. Atlas plans and delegates. Specialized employees execute. Proof-of-work records who / what / when / cost / result. The economic ledger separates actual results from projections.`,
  },
  {
    id: "product",
    title: "3. Live product",
    body: `Aura OS already runs as a live command center: CEO / Atlas, employee roster, missions, approval gates, tasks, proof-of-work, company memory, economic ledger, Lead Hunter, website, wallet, trading desk, yield desk, machine API, marketplace, and community. Commercial validation — paying customers and settled revenue — is the next milestone.`,
  },
  {
    id: "workforce",
    title: "4. AI workforce",
    body: `Roles include Atlas (CEO), Quant (trading), Ledger (finance), Cass (engineering), Iris (product), Vela (growth), Orin (social), and Yield (liquidity). One mission becomes coordinated execution across the roster under founder control.`,
  },
  {
    id: "proof",
    title: "5. Proof of work & economic truth",
    body: `AI work must leave evidence — settled proof cards with sources and cost. Revenue and customers are actual only after ledger settlement. Projected numbers are labeled. Allocated budgets and in-app rewards are not company revenue. Transparency is intentional.`,
  },
  {
    id: "business",
    title: "6. Business model",
    body: `Subscriptions are the core model: Starter €49/mo, Growth €149/mo (recommended), Autonomous €399+/mo. Expansion comes from adding employees, automation, API usage, additional companies, enterprise, and marketplace fees. The token is not the core business model.`,
  },
  {
    id: "token",
    title: "7. Token & fair launch",
    body: `AURA is the ecosystem layer for participation, incentives, progression, selected in-app utility, agent/company economy, marketplace incentives, and future governance. Fixed maximum supply: 777,777,777 AURA. Fair launch plan (${TOKEN_LAUNCH_DISPLAY}): €3,000 strategic acquisition + €3,000 across 30 risk-controlled market-ops agents. Volume target up to $500k cumulative — target, not guaranteed. No wash / self / circular trading. No contract address until T-0.`,
  },
  {
    id: "desks",
    title: "8. Trading & yield desks",
    body: `Quant desk: paper/live modes, caps, kill switch, regime analysis, backtests — autonomy does not mean unlimited risk. Yield desk parks residual capital across conservative→extreme strategies; all carry market, smart-contract, liquidity, and IL risk. Indicative ranges are not guaranteed returns.`,
  },
  {
    id: "gtm",
    title: "9. Go-to-market",
    body: `Start where ROI is obvious: local businesses (leads, reviews, follow-up), agencies, online businesses, and web3/crypto ops. First case study framing: Vienna web agency — €1,500 website package, five new customers/month, full loop mission → execution → customer → revenue.`,
  },
  {
    id: "moat",
    title: "10. Moat",
    body: `The moat is not the token. It is company memory, mission orchestration, multi-agent execution, proof-of-work, economic ledger, founder approvals, integrations, agent performance history, economic infrastructure, and a network of autonomous companies. Anyone can call an LLM; few platforms turn AI into an operating company.`,
  },
  {
    id: "roadmap",
    title: "11. Roadmap",
    body: `Phase 1 — working product (live). Phase 2 — commercial validation. Phase 3 — scale 100→1,000 companies + marketplace. Phase 4 — autonomous network. 90-day mission: prove paying companies and settled revenue (1–10 → 10–50 → 50–100+), not feature theater.`,
  },
  {
    id: "disclaimer",
    title: "12. Disclaimer",
    body: TOKEN_DISCLAIMER,
  },
] as const;

export const LIGHTPAPER = {
  title: "Aura OS Lightpaper",
  subtitle: "Own a company. Let AI employees execute. Keep the upside.",
  bullets: [
    {
      h: "What it is",
      p: "An operating system for autonomous companies — missions, AI employees, proof-of-work, and a ledger that only counts settled economics.",
    },
    {
      h: "How you make money (the company)",
      p: "Software subscriptions (€49 / €149 / €399+) plus seats, compute, API, and marketplace. Product first.",
    },
    {
      h: "What the token is for",
      p: "Ecosystem participation, rewards, progression, and agent-economy utility around the product — not the primary P&L. Fixed maximum supply: 777,777,777 AURA.",
    },
    {
      h: "Fair launch",
      p: `${TOKEN_LAUNCH_DISPLAY}. €6k initial market-ops plan (€3k buy + €3k across 30 capped agents). No contract address until T-0. Volume targets are not guarantees.`,
    },
    {
      h: "Control",
      p: "Founder approval gates, risk caps, kill switches. Autonomy ≠ unlimited risk.",
    },
    {
      h: "Proof",
      p: "Every meaningful action leaves who / what / when / cost / result. No fake revenue dashboards.",
    },
  ],
} as const;
