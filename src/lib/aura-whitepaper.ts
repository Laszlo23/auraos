import {
  AURA_ALLOCATIONS,
  AURA_MAX_SUPPLY_DISPLAY,
  AURA_TEAM_VESTING,
  formatAuraAmount,
} from "@/lib/aura-token";

export type WpBlock =
  | { kind: "p"; text: string }
  | { kind: "lead"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "notice"; text: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type WpSection = {
  id: string;
  title: string;
  blocks: WpBlock[];
};

export const WHITEPAPER_META = {
  title: "AURA Token — the economic layer of Building Culture",
  subtitle: "AURA OS · AURA Lokal · Building Culture ecosystem",
  version: "Whitepaper 1.0",
  date: "15 August 2026",
} as const;

const ALLOC_ROWS = AURA_ALLOCATIONS.map((a) => [
  a.label,
  `${a.pct}%`,
  formatAuraAmount(a.amount),
]);

export const AURA_WHITEPAPER: WpSection[] = [
  {
    id: "notice",
    title: "Important notice",
    blocks: [
      {
        kind: "notice",
        text: "This is a strategic and technical whitepaper draft — not legal, financial, tax, or investment advice. AURA is intended as a utility and ecosystem token. Nothing here promises future token value, guaranteed returns, guaranteed liquidity, or investment performance. Before any public token offering, the project must obtain professional advice on MiCA and applicable Austrian and European law. Classification cannot be determined by branding alone.",
      },
    ],
  },
  {
    id: "summary",
    title: "1. Executive summary",
    blocks: [
      {
        kind: "p",
        text: "AURA is the economic coordination layer connecting products, users, businesses, and AI agents in the Building Culture ecosystem.",
      },
      {
        kind: "ul",
        items: [
          "AURA OS — AI-native operating environment for people, businesses, and autonomous agents.",
          "AURA Lokal — local-business growth and participation, starting in Vienna.",
        ],
      },
      {
        kind: "lead",
        text: "First objective: 1,000 local businesses. Second: the contributor network around them. Third: convert that network into an AURA-powered economy.",
      },
      {
        kind: "p",
        text: "AURA is not designed merely as another cryptocurrency. It is the transaction, incentive, reputation, and participation layer of Building Culture.",
      },
    ],
  },
  {
    id: "problem",
    title: "2. The problem",
    blocks: [
      {
        kind: "p",
        text: "A local business may already have a website, Google profile, social accounts, ads, CRM, reviews, payments, and AI tools — yet they do not operate as one local economic network. People participate online without a simple way to monetize attention, knowledge, and local contribution. The missing layer is a shared economic system. AURA is designed to provide it.",
      },
    ],
  },
  {
    id: "vision",
    title: "3. Building Culture vision",
    blocks: [
      {
        kind: "p",
        text: "Building Culture is the ecosystem. AURA is the economic layer. Products can include AURA OS, AURA Lokal, AI agents, local-business tools, creator products, marketplaces, and future applications.",
      },
      {
        kind: "lead",
        text: "Build products that create real economic activity, then let that activity reinforce the AURA economy — utility first, token as coordination, not the other way around.",
      },
    ],
  },
  {
    id: "os",
    title: "4. AURA OS",
    blocks: [
      {
        kind: "p",
        text: "AURA OS moves software from User → App → Action toward User → Intent → AI Agent → Action → Result. Agents can research, market, support, sell, administer, create, generate leads, analyze, automate, and execute workflows. AURA is how those agents participate economically.",
      },
    ],
  },
  {
    id: "lokal",
    title: "5. AURA Lokal",
    blocks: [
      {
        kind: "p",
        text: "AURA Lokal is the physical-world growth engine. Vienna first. It connects businesses, customers, contributors, AI, data, and rewards — visibility, acquisition, authentic feedback, content, retention, referrals, and operations.",
      },
      {
        kind: "notice",
        text: "AURA Lokal does not sell fake or incentivized Google reviews. Google requires genuine experiences and prohibits payment or incentives in exchange for reviews. Users may be rewarded for verified discovery, surveys, authentic feedback, product testing, content, referrals, compliant campaigns, and marketplace tasks. Google reviews stay independent.",
      },
    ],
  },
  {
    id: "vienna",
    title: "6. Vienna 1,000-business strategy",
    blocks: [
      {
        kind: "lead",
        text: "Launch city: Vienna. Target: 1,000 businesses — restaurants, cafés, hairdressers, beauty, fitness, trades, realty, clinics, hotels, automotive, retail, professional services, entertainment.",
      },
      {
        kind: "p",
        text: "Density in one city beats thin coverage of 100,000 businesses online. The city is the laboratory.",
      },
    ],
  },
  {
    id: "flywheel",
    title: "7–8. Flywheel and street acquisition",
    blocks: [
      {
        kind: "p",
        text: "Business joins → growth tools → customers and contributors interact → users earn AURA for legitimate participation → users invite others → businesses get more activity → more businesses join → more economic activity enters AURA → utility increases.",
      },
      {
        kind: "p",
        text: "Street-level onboarding in Vienna: create an account, verify as required, complete a first legitimate paid task or onboarding reward, then refer. The initial cash incentive is an acquisition expense — not payment for a Google review.",
      },
    ],
  },
  {
    id: "cash-to-aura",
    title: "9–12. From cash to AURA",
    blocks: [
      {
        kind: "ul",
        items: [
          "Phase 1 — fiat onboarding.",
          "Phase 2 — fiat + AURA.",
          "Phase 3 — AURA-first rewards.",
          "Contributors: discovery, surveys, testing, authentic feedback, content, referrals, campaigns, marketplace tasks.",
          "Referrals pay only after the invited person creates verified value — not endless recruitment.",
          "Businesses pay for subscriptions, AI, campaigns, analytics, visibility, marketplace services — in fiat, stablecoins, or AURA as architecture allows.",
        ],
      },
    ],
  },
  {
    id: "utility",
    title: "13. Token utility",
    blocks: [
      {
        kind: "ul",
        items: [
          "Ecosystem payments for eligible products and services",
          "Contributor and referral rewards tied to verified activity",
          "AI-agent and marketplace transactions",
          "Premium access and merchant benefits",
          "Selected governance where legally and technically appropriate",
          "Optional staking / locking for tiers — never a promise of yield",
        ],
      },
    ],
  },
  {
    id: "spec",
    title: "14–20. Token specification",
    blocks: [
      {
        kind: "lead",
        text: `Maximum supply: ${AURA_MAX_SUPPLY_DISPLAY} AURA. Fixed cap unless a future governance process explicitly authorizes otherwise.`,
      },
      {
        kind: "table",
        headers: ["Allocation", "Share", "AURA"],
        rows: [...ALLOC_ROWS, ["Total", "100%", AURA_MAX_SUPPLY_DISPLAY]],
      },
      {
        kind: "p",
        text: `Team (${formatAuraAmount(93_333_333)} AURA): ${AURA_TEAM_VESTING.note} Private / strategic tokens carry defined lockups. Liquidity management should be transparent; locks, when used, publicly verifiable. No promise of price stability. Treasury wallets should be identifiable whenever legally possible.`,
      },
      {
        kind: "notice",
        text: "These percentages are a proposed tokenomics framework, not a finalized legal allocation or an offer to sell.",
      },
    ],
  },
  {
    id: "emission",
    title: "21–24. Emission, rewards, fraud, reputation",
    blocks: [
      {
        kind: "p",
        text: "Fixed maximum supply plus controlled distribution — not unlimited printing. Rewards follow proof of contribution, not recruitment-alone or holding-alone. Anti-fraud: verification, device signals, duplicate detection, cooldowns, reward limits, manual review, AI-assisted pattern detection. Reputation is an internal score (activity quality, disputes, fraud signals) — not the same as token ownership.",
      },
    ],
  },
  {
    id: "agents",
    title: "25–28. Agent economy, cards, revenue",
    blocks: [
      {
        kind: "p",
        text: "Long-term, agents may earn and spend AURA for leads, campaigns, support, research, and workflows — machine-to-machine economics. Any card or spend product must come from regulated partners. AURA is not a bank, payment institution, or card issuer unless separately authorized.",
      },
      {
        kind: "p",
        text: "AURA Lokal revenue: SaaS, premium AI, campaigns, marketplace fees, qualified leads, visibility, financial referrals, enterprise. Illustrative Lokal prices: Starter €29 / Growth €79 / Pro €149 / Enterprise custom — to be validated in market. Aura OS subscriptions remain a separate product P&L.",
      },
    ],
  },
  {
    id: "stages",
    title: "29–36. 1,000 businesses, expansion, unit economics",
    blocks: [
      {
        kind: "ul",
        items: [
          "Stage 1 (0–100): founder-led sales, visits, free trials — prove fit.",
          "Stage 2 (100–300): scripts, ambassadors, vertical pages, automated onboarding.",
          "Stage 3 (300–600): district density, clusters, events.",
          "Stage 4 (600–1,000): referral loops, contributor network, AI sales, case studies.",
          "Then Austria → DACH → Europe → global. Vienna is the first AURA economy, not a software dump.",
          "Illustrative 1,000 × €79 = €79k MRR — a scenario, not a forecast.",
          "€20 street experiment × 1,000 contributors = €20k acquisition budget, measured on conversion, verification, 7/30-day retention, referrals, and LTV. Not compensation for Google reviews.",
        ],
      },
    ],
  },
  {
    id: "community",
    title: "37–43. Community, data, governance, compliance",
    blocks: [
      {
        kind: "p",
        text: "Vienna community (e.g. WhatsApp) can accelerate formation — without unnecessary collection of personal phone numbers. GDPR: minimum necessary data, access control, deletion rights. Governance starts founder-led, then transparent treasury, then selected community votes — never decentralization as marketing. Treasury: multisig, limits, public reporting where possible.",
      },
      {
        kind: "notice",
        text: "AURA will not sell Google reviews, pay for Google reviews, require positive ratings or specific text, coordinate artificial campaigns, or suppress negatives. Reviews must reflect genuine experiences. That is a product principle, not a footnote.",
      },
    ],
  },
  {
    id: "moat",
    title: "44–48. Why this is bigger than reviews",
    blocks: [
      {
        kind: "p",
        text: "The stack is discovery → acquisition → experience → feedback → content → retention → referral → revenue. The moat is businesses + contributors + data + AI + distribution + density — not the ticker. AURA Lokal is the physical-world engine. AURA OS is AI-native execution. AURA coordinates the economy.",
      },
    ],
  },
  {
    id: "roadmap",
    title: "49–52. Roadmap and KPIs",
    blocks: [
      {
        kind: "ul",
        items: [
          "Phase 0 — architecture, legal analysis, Lokal MVP, OS, onboarding.",
          "Phase 1 — Vienna: first 100 businesses, first contributor cohort, street experiment.",
          "Phase 2 — path to 1,000 businesses and recurring revenue.",
          "Phase 3 — AURA utility, rewards, business payments, liquidity.",
          "Phase 4–7 — Austria, DACH, Europe, global.",
          "Track paying businesses, MRR, CAC, churn, verified contributors, tasks, fraud rate, AURA velocity. Target is 1,000 active paying businesses, not empty registrations.",
        ],
      },
    ],
  },
  {
    id: "why-token",
    title: "53–56. Why the token exists",
    blocks: [
      {
        kind: "p",
        text: "Without a common layer, businesses use euros, creators use platforms, agents use APIs, users use points, referrals use proprietary credits. AURA can share one coordination layer. Demand should come from utility — services, rewards, agent payments, access — never from a promise of appreciation.",
      },
      {
        kind: "lead",
        text: "Utility does not guarantee market value. AURA can lose value, become illiquid, or fail. MiCA requires those warnings.",
      },
      {
        kind: "p",
        text: "AURA must not depend on Google, WhatsApp, X, Meta, one chain, or one AI vendor. If one platform changes, the ecosystem continues.",
      },
    ],
  },
  {
    id: "risks",
    title: "55. Principal risks",
    blocks: [
      {
        kind: "ul",
        items: [
          "Market, regulatory, technology, and security risk",
          "Adoption, competition, liquidity, and execution risk",
          "Fraud in contributor economies",
          "Third-party platform policy changes",
        ],
      },
    ],
  },
  {
    id: "close",
    title: "57–60. Thesis and close",
    blocks: [
      {
        kind: "p",
        text: "Start with 1,000 businesses in Vienna, then 10,000, then 100,000. Humans create value. Businesses create demand. AI creates execution. AURA coordinates the economy. The investment thesis is not “buy because the token will go up.” It is: build a real economy around live products, starting with a dense Vienna network.",
      },
      {
        kind: "lead",
        text: "Every useful action should be able to create economic value. AURA OS. AURA Lokal. Building Culture. One ecosystem. One economy.",
      },
      {
        kind: "notice",
        text: "This document is not the final regulatory crypto-asset whitepaper. Before any public offer, admission to trading, or marketing campaign involving AURA, obtain specialist Austrian/EU legal advice and prepare applicable MiCA disclosures. AURA is not a promise of profit. Success depends on execution, adoption, compliance, technology, and real economic activity.",
      },
    ],
  },
];
