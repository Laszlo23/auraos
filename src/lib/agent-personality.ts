/** Subtle employee voice — copy only, never fake metrics. */

export type AgentVoice = {
  tagline: string;
  idle: string;
  working: string;
  waiting: string;
  failed: string;
};

const VOICES: Record<string, AgentVoice> = {
  Atlas: {
    tagline: "Calm. Strategic. Owns the plan.",
    idle: "Ready when you are.",
    working: "Aligning the company.",
    waiting: "Waiting on your call.",
    failed: "We hit a wall — let's decide the next move.",
  },
  Vela: {
    tagline: "Growth operator. Fast. Marketing-first.",
    idle: "Channels quiet. Give me a brief.",
    working: "Pushing the funnel.",
    waiting: "Draft ready — your move.",
    failed: "Outreach missed. Tighten the target.",
  },
  Cass: {
    tagline: "Technical. Precise. Ships.",
    idle: "Standing by for build work.",
    working: "Building.",
    waiting: "Need a clear spec.",
    failed: "Build failed — check the brief.",
  },
  Iris: {
    tagline: "Product-minded. Customer-oriented.",
    idle: "Storefront waiting for direction.",
    working: "Shaping the offer.",
    waiting: "Copy draft needs approval.",
    failed: "Offer didn't land — iterate.",
  },
  Ledger: {
    tagline: "Conservative. Numbers first.",
    idle: "Books are quiet.",
    working: "Reconciling.",
    waiting: "Settlement needs your eye.",
    failed: "Expense without return — flag it.",
  },
  Quant: {
    tagline: "Risk-aware. Analytical. Experimental.",
    idle: "Desk idle — capital rules apply.",
    working: "Watching markets inside caps.",
    waiting: "Trade needs founder approval.",
    failed: "Trade aborted — limits held.",
  },
  Orin: {
    tagline: "Social voice. Draft-first.",
    idle: "Mentions quiet.",
    working: "Drafting the reply.",
    waiting: "Reply waiting for you.",
    failed: "Couldn't post — check connection.",
  },
  Juno: {
    tagline: "Customer success. Clear follow-ups.",
    idle: "No open customer threads.",
    working: "Following up.",
    waiting: "Outreach draft ready.",
    failed: "No reply path — try a new angle.",
  },
};

const FALLBACK: AgentVoice = {
  tagline: "On the roster.",
  idle: "Standing by.",
  working: "On it.",
  waiting: "Needs founder input.",
  failed: "Blocked — needs a decision.",
};

export function agentVoice(name: string): AgentVoice {
  return VOICES[name] ?? FALLBACK;
}

export function agentStatusLine(
  name: string,
  opts: {
    paused?: boolean;
    /** True when agent has a running or queued task. */
    busy?: boolean;
    currentTask?: string | null;
    failed?: boolean;
  },
): string {
  const voice = agentVoice(name);
  if (opts.paused) return "Paused by founder.";
  if (opts.failed) return voice.failed;
  const task = opts.currentTask?.trim();
  if (task && task.toLowerCase().includes("wait")) return voice.waiting;
  if (opts.busy) return voice.working;
  return voice.idle;
}
