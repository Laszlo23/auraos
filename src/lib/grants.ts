/**
 * Grant & credit programs we are applying to, plus the standing narrative used
 * on /grants and in the exported application kit. Amounts marked `unverified`
 * were not confirmable from a machine-readable source — always re-check the
 * official page before quoting a figure in an application.
 */

export type Program = {
  id: string;
  org: string;
  program: string;
  gives: string;
  needs: string;
  status: "apply-now" | "needs-traction" | "unverified";
  url: string;
  unlocks: string;
};

export const PROGRAMS: Program[] = [
  {
    id: "google-cloud",
    org: "Google",
    program: "Google for Startups Cloud — Start tier",
    gives:
      "Cloud + Gemini/Vertex credits (Start tier is self-serve; Scale tier needs a VC or accelerator nomination)",
    needs: "Early stage, under 5 years old, self-apply",
    status: "apply-now",
    url: "https://cloud.google.com/startup",
    unlocks: "Gemini inference for the CEO agent and every AI-backed x402 endpoint.",
  },
  {
    id: "microsoft",
    org: "Microsoft",
    program: "Microsoft for Startups Founders Hub",
    gives: "Azure + Azure OpenAI credits, tiered and scaling with usage",
    needs: "Self-apply with a product description, no investor required",
    status: "apply-now",
    url: "https://www.microsoft.com/en-us/startups",
    unlocks: "A second inference provider so agent work never blocks on one vendor.",
  },
  {
    id: "aws",
    org: "AWS",
    program: "AWS Activate — Founders tier",
    gives: "Self-serve credits (Portfolio tier is larger but requires an investor referral)",
    needs: "Any startup can self-sign-up",
    status: "apply-now",
    url: "https://aws.amazon.com/startups/",
    unlocks: "Object storage and background workers for agent memory and file ingest.",
  },
  {
    id: "base",
    org: "Base / Coinbase",
    program: "Base ecosystem — Builder Rewards, Batches, CDP credits",
    gives: "Weekly builder rewards, CDP API tier, founder tracks via Base Batches / Ecosystem Fund RFBs",
    needs: "Ship on Base; cohorts are competitive but early teams are welcome",
    status: "apply-now",
    url: "https://docs.base.org/get-started/get-funded",
    unlocks:
      "We already settle x402 payments and reward drops on Base — closest ecosystem fit.",
  },
  {
    id: "base-builder-grants",
    org: "Base",
    program: "Base Builder Grants (retroactive)",
    gives: "Retroactive grants typically 1–5 ETH for shipped Base projects",
    needs: "Working prototype live on Base with clear ecosystem value",
    status: "apply-now",
    url: "https://paragraph.com/@grants.base.eth/calling-based-builders",
    unlocks: "Non-dilutive runway for agent OS work already settling on Base.",
  },
  {
    id: "arbitrum-trailblazer",
    org: "Arbitrum",
    program: "Trailblazer AI Grant Program",
    gives: "$1M pool for AI agents and onchain AI products on Arbitrum chains",
    needs: "Build or commit to build agentic / AI products on Arbitrum",
    status: "apply-now",
    url: "https://arbitrum.foundation/grants",
    unlocks: "Strong narrative fit — Aura OS is an AI-employee operating system.",
  },
  {
    id: "polygon-cgp",
    org: "Polygon",
    program: "Community Grants Program (Questbook / seasonal tracks)",
    gives: "Milestone-based POL grants from the community treasury (seasonal tracks)",
    needs: "Build or migrate to Polygon; AI tracks have appeared in recent seasons",
    status: "apply-now",
    url: "https://gitcoin.co/apps/polygon-grants",
    unlocks: "Optional second settlement / agent-payments surface beside Base.",
  },
  {
    id: "optimism",
    org: "Optimism",
    program: "Optimism Grants (Season cycles)",
    gives: "Growth / audit / thematic grants when seasons are open",
    needs: "Ship public goods or growth apps in the Superchain",
    status: "apply-now",
    url: "https://www.opgrants.io/",
    unlocks: "Retro / public-goods framing for open agent rails and receipts.",
  },
  {
    id: "alchemy",
    org: "Alchemy",
    program: "Startup / growth credits + Arbitrum Orbit infra credits",
    gives: "Infrastructure credits; larger Orbit packages via Alchemy–Arbitrum programme",
    needs: "Contact / partner apply — we already use Alchemy RPC + Light Accounts",
    status: "apply-now",
    url: "https://www.alchemy.com/pricing",
    unlocks: "RPC headroom for smart-wallet provisioning and settlement receipts.",
  },
  {
    id: "solana",
    org: "Solana Foundation",
    program: "Foundation grants + Superteam microgrants",
    gives: "Milestone grants for public goods; Superteam microgrants for early builders",
    needs: "Public-good or Solana-native component — stretch unless we ship Solana rails",
    status: "needs-traction",
    url: "https://solana.org/grants-funding",
    unlocks: "Only pursue if we add a Solana settlement path.",
  },
  {
    id: "ethereum-esp",
    org: "Ethereum Foundation",
    program: "Ecosystem Support Program (Wishlist / RFPs)",
    gives: "Non-dilutive support for open-source public goods",
    needs: "Open-source deliverable aligned to a Wishlist/RFP item",
    status: "needs-traction",
    url: "https://esp.ethereum.foundation/applicants",
    unlocks: "Open-source x402 / agent-payment tooling as a public good.",
  },
  {
    id: "aws-preseed",
    org: "Austria Wirtschaftsservice",
    program: "aws Preseed — Innovative Solutions / Deep Tech",
    gives: "Non-repayable cash grant for personnel and development",
    needs: "Austrian company or company in formation, pre-seed, innovative product",
    status: "apply-now",
    url: "https://www.aws.at/en/aws-preseed-innovative-solutions/",
    unlocks: "Salary runway for the four founders through the first public season.",
  },
  {
    id: "ffg",
    org: "FFG (Austria)",
    program: "Innovationsscheck / Basisprogramm",
    gives: "Small voucher grant for external R&D services; Basisprogramm funds larger R&D projects",
    needs: "Austrian SME with an R&D project; the voucher has minimal paperwork",
    status: "apply-now",
    url: "https://www.ffg.at/en",
    unlocks: "Independent research on agent safety and spend-cap enforcement.",
  },
  {
    id: "openai",
    org: "OpenAI",
    program: "OpenAI for Startups / Converge",
    gives: "API credits and programme access (amounts unverified)",
    needs: "Usually investor-backed or invited; cohort based",
    status: "needs-traction",
    url: "https://openai.com/index/openai-for-startups/",
    unlocks: "Frontier reasoning for the CEO agent's long-horizon planning.",
  },
  {
    id: "anthropic",
    org: "Anthropic",
    program: "Claude for Startups",
    gives: "Claude API credits (tiers and eligibility unverified)",
    needs: "Early-stage startup; larger tiers likely need a partner",
    status: "unverified",
    url: "https://claude.com/programs/startups",
    unlocks: "Long-context agent memory and document-heavy acquisition work.",
  },
  {
    id: "lovable",
    org: "Lovable",
    program: "Partner / enterprise programme",
    gives: "No public startup-credit programme; enterprise contact only",
    needs: "Direct outreach",
    status: "unverified",
    url: "https://lovable.dev/enterprise",
    unlocks: "Build and Cloud headroom — the whole product runs on Lovable today.",
  },
  {
    id: "eic",
    org: "European Commission",
    program: "EIC Accelerator",
    gives: "Grant up to EUR 2.5M plus optional equity investment",
    needs: "Breakthrough deep tech with real market traction; several cut-offs per year",
    status: "needs-traction",
    url: "https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en",
    unlocks: "Target for the round after a public launch, not today.",
  },
];

export const STATUS_LABEL: Record<Program["status"], string> = {
  "apply-now": "Apply now",
  "needs-traction": "Needs traction",
  unverified: "Unverified",
};

/** The standing narrative — reused verbatim in every application form. */
export const PITCH = {
  oneLine:
    "Aura OS is an operating system for AI companies: you describe a business, autonomous AI employees run it, and every action they take is measured, budgeted and settled onchain.",
  problem:
    "AI agents today are demos. They chat, they do not run anything. There is no shared memory, no budget, no accountability and no way for one agent to pay another for work.",
  solution:
    "Aura OS gives every founder a company of AI employees with one shared memory, a token budget per employee, an approval gate before anything spends money or goes public, and a machine-payable API layer so agents can buy and sell work from each other in USDC.",
  why: "Agent-to-agent commerce needs rails. We built them: an x402 gateway that prices each endpoint, verifies the payment, splits revenue 60/20/20 between the founder, the treasury and the platform, and settles against Base.",
  useOfCredits:
    "Inference is the single biggest cost: every agent-hour is model calls. Credits go to model inference for the agent runtime, RPC for smart-wallet provisioning and settlement receipts, and storage for company memory and file ingest.",
} as const;

export const TEAM_SIZE = 4;
