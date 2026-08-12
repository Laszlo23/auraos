/**
 * Reusable grant / credits application kit.
 * Numbers marked live should be refreshed from public_network_totals before paste.
 */

import { PITCH, PROGRAMS, TEAM_SIZE, type Program } from "@/lib/grants";
import { LEGAL_EMAIL, SITE_URL } from "@/lib/site";

export type GrantTraction = {
  companies: number;
  agents: number;
  actions24h: number;
  paidCalls: number;
  usdcPaid: number;
};

/** Standing answers — copy into portals. Keep traction honest. */
export function grantAnswers(t: GrantTraction) {
  const tractionLine = `${t.companies} companies · ${t.agents} AI employees · ${t.actions24h} actions in 24h · ${t.paidCalls} paid x402 calls · $${t.usdcPaid.toFixed(4)} USDC settled (live ledger).`;

  return {
    contactEmail: LEGAL_EMAIL,
    applicantNote: `Primary contact ${LEGAL_EMAIL}. Mailbox SMTP connected for founder-approved outreach from Aura OS.`,
    oneLiner: PITCH.oneLine,
    words50: PITCH.oneLine,
    words250: `${PITCH.problem} ${PITCH.solution} ${PITCH.why}`,
    words1000: [
      PITCH.oneLine,
      "",
      "Problem",
      PITCH.problem,
      "",
      "Solution",
      PITCH.solution,
      "",
      "Why now / why us",
      PITCH.why,
      "",
      "Traction (honest)",
      tractionLine,
      "Trading / demo flows inside the product are labelled simulation where they appear. We do not inflate waitlist or referral counts.",
      "",
      "Team",
      `Self-funded team of ${TEAM_SIZE}. Product live at ${SITE_URL}. Public receipts: ${SITE_URL}/live · ${SITE_URL}/grants · ${SITE_URL}/proof.`,
      "",
      "Use of credits / funds",
      PITCH.useOfCredits,
      "",
      "Business model",
      "Founders buy seats / compute. Agents spend budgeted tokens. Machine-payable x402 APIs settle in USDC on Base with a 60/20/20 split (founder / treasury / platform).",
      "",
      "Ask",
      "Compute and RPC credits first. Cash grants second once traction compounds. We lead with architecture and a running product, not vanity metrics.",
    ].join("\n"),
    tractionLine,
    architecture:
      "TanStack Start · Lovable Cloud / Postgres RLS · agent runtime (role, memory, budget, spend cap) · x402 paid API gateway · Alchemy Light Accounts · settlement receipts on Base.",
    website: SITE_URL,
    live: `${SITE_URL}/live`,
    grantsPage: `${SITE_URL}/grants`,
    proof: `${SITE_URL}/proof`,
  };
}

export type GrantOutreachDraft = {
  programId: string;
  subject: string;
  body: string;
  applyUrl: string;
  channel: "portal" | "email-optional";
};

/** Outreach drafts — portals are primary; email is optional follow-up only. */
export function grantOutreachDrafts(t: GrantTraction): GrantOutreachDraft[] {
  const a = grantAnswers(t);
  const footer = `\n\n—\n${a.oneLiner}\nLive: ${a.live}\nKit: ${a.grantsPage}\nContact: ${a.contactEmail}`;

  return PROGRAMS.filter((p) => p.status === "apply-now").map((p) => ({
    programId: p.id,
    applyUrl: p.url,
    channel: "portal" as const,
    subject: `Aura OS — ${p.program} application / intro`,
    body: [
      `Hello ${p.org} team,`,
      "",
      `We are applying to ${p.program}.`,
      "",
      a.oneLiner,
      "",
      `Why your programme: ${p.unlocks}`,
      "",
      `Honest traction today: ${a.tractionLine}`,
      "",
      "We already ship agent companies with shared memory, budgets, founder approval gates, and USDC settlement on Base (x402).",
      "",
      `Apply / programme link we used: ${p.url}`,
      `Full narrative + architecture: ${a.grantsPage}`,
      footer,
    ].join("\n"),
  }));
}

export function priorityApplyOrder(): Program[] {
  const order = [
    "google-cloud",
    "microsoft",
    "aws",
    "base",
    "base-builder-grants",
    "arbitrum-trailblazer",
    "alchemy",
    "polygon-cgp",
    "optimism",
    "anthropic",
    "aws-preseed",
    "ffg",
  ];
  const byId = new Map(PROGRAMS.map((p) => [p.id, p]));
  const ranked = order.map((id) => byId.get(id)).filter(Boolean) as Program[];
  const rest = PROGRAMS.filter((p) => !order.includes(p.id));
  return [...ranked, ...rest];
}

export function grantKitMarkdown(t: GrantTraction): string {
  const a = grantAnswers(t);
  const drafts = grantOutreachDrafts(t);
  const lines = [
    "# Aura OS — grant & credits application kit",
    "",
    `_Generated for paste into portals. Traction snapshot: ${a.tractionLine}_`,
    "",
    "## Contact",
    `- Email: ${a.contactEmail}`,
    `- Site: ${a.website}`,
    `- Live ledger: ${a.live}`,
    "",
    "## One-liner",
    a.oneLiner,
    "",
    "## ~50 words",
    a.words50,
    "",
    "## ~250 words",
    a.words250,
    "",
    "## Long form",
    a.words1000,
    "",
    "## Architecture",
    a.architecture,
    "",
    "## Programmes (apply via official portal — do not invent emails)",
    ...priorityApplyOrder().map(
      (p) => `- **${p.org} — ${p.program}** [${p.status}](${p.url}) — ${p.gives}`,
    ),
    "",
    "## Ready outreach bodies (optional; prefer portal submit)",
    ...drafts.flatMap((d) => [
      `### ${d.programId}`,
      `Apply: ${d.applyUrl}`,
      `Subject: ${d.subject}`,
      "```",
      d.body,
      "```",
      "",
    ]),
    "",
    "## Honesty rules",
    "- Never invent waitlist, revenue, or user counts.",
    "- Label simulations as simulations.",
    "- Re-check programme pages before quoting dollar amounts.",
  ];
  return lines.join("\n");
}
