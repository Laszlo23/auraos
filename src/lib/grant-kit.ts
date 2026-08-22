/**
 * Reusable grant / credits application kit.
 * Numbers marked live should be refreshed from public_network_totals before paste.
 */

import { PITCH, PROGRAMS, TEAM_SIZE, type Program } from "@/lib/grants";
import { LEGAL_EMAIL, LOCAL_PRODUCT_NAME, SITE_URL } from "@/lib/site";

export type GrantTraction = {
  companies: number;
  agents: number;
  actions24h: number;
  paidCalls: number;
  usdcPaid: number;
};

/** Timed VO for grant presentation video — also mirrored in docs/grants/video-script.md */
export const GRANT_VIDEO_SCRIPT = `# Aura OS — grant presentation video script (~90–120s)

Use with the Aura OS lockup (/brand/aura-logo.png) on screen. Record landscape 16:9.
Speak calmly; cut B-roll of /live, /grants, /lokal, /nachbar.

**On-screen title card:** Aura OS + ${LOCAL_PRODUCT_NAME} · aibusiness.fun
**End card:** founders@aibusiness.fun · /grants

## Beat sheet (total ~110s)

| Time | VO (read aloud) | Visual |
|------|-----------------|--------|
| 0:00–0:08 | “Aura OS is an operating system for AI companies. You describe a business. Autonomous AI employees run it — with memory, budgets, and onchain settlement.” | Logo lockup → console / workforce |
| 0:08–0:22 | “Agents today chat. Ours ship: posts, outreach drafts, missions, and weekly proof. Every action is measured. Nothing spends money or goes public without founder approval.” | Task feed · approval gate |
| 0:22–0:38 | “Settlement is real. Machine-payable APIs answer HTTP 402, take USDC on Base, and split sixty / twenty / twenty — founder, treasury, platform.” | /live ledger · x402 |
| 0:38–0:55 | “${LOCAL_PRODUCT_NAME} is the same organism for neighborhood shops. Reputation after a real visit. Guest check-in. Review invites — never fake stars.” | /lokal hero · /kunden QR · review bridge |
| 0:55–1:10 | “We’re self-funded. Four founders. Product is live. Traction on screen is from the running network — not invented waitlists.” | /grants traction strip · /proof |
| 1:10–1:25 | “We’re asking partners for compute and RPC credits first — inference for the agent runtime, Gas Manager for Light Accounts, ecosystem grants where we already ship.” | Programme logos / kit download |
| 1:25–1:40 | “Apply with our paste-ready kit at aibusiness.fun/grants. Contact founders@aibusiness.fun. See it running at /live.” | End card + QR to /grants |

## Short cut (~45s)

1. One-liner (Aura OS = AI company OS with budgets + onchain settlement).
2. Local: real visits → reputation, no fake stars.
3. Honest traction from live ledger.
4. Ask: compute / gas credits. Kit: /grants.

## Do / don't

- Do show live URLs and the brand logo from /brand.
- Do say “credits / compute” before “cash grant”.
- Don't invent revenue, waitlists, or user counts.
- Don't claim Google reviews are rewarded — they are optional and unpaid.
`;

/** Standing answers — copy into portals. Keep traction honest. */
export function grantAnswers(t: GrantTraction) {
  const callsBit = t.paidCalls > 0 ? ` · ${t.paidCalls} paid x402 calls` : "";
  const usdcBit = t.usdcPaid > 0 ? ` · $${t.usdcPaid.toFixed(4)} USDC settled (live ledger)` : "";
  const tractionLine = `${t.companies} companies · ${t.agents} AI employees · ${t.actions24h} actions in 24h${callsBit}${usdcBit}.`;

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

export const GRANT_PRIORITY_IDS = [
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
] as const;

export function priorityApplyOrder(): Program[] {
  const byId = new Map(PROGRAMS.map((p) => [p.id, p]));
  const ranked = GRANT_PRIORITY_IDS.map((id) => byId.get(id)).filter(Boolean) as Program[];
  const rest = PROGRAMS.filter((p) => !(GRANT_PRIORITY_IDS as readonly string[]).includes(p.id));
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
    "## Video script",
    `${SITE_URL}/grants (download button) · repo docs/grants/video-script.md`,
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

/** Machine checklist for “grant-ready” — used by tests and optional CI. */
export type GrantReadyIssue = { code: string; message: string };

export function assessGrantReady(
  t: GrantTraction = {
    companies: 0,
    agents: 0,
    actions24h: 0,
    paidCalls: 0,
    usdcPaid: 0,
  },
): { ok: boolean; issues: GrantReadyIssue[] } {
  const issues: GrantReadyIssue[] = [];
  const ids = new Set(PROGRAMS.map((p) => p.id));

  if (PROGRAMS.length < 8) {
    issues.push({ code: "programs_thin", message: "Expected a full programme list for outreach." });
  }

  for (const p of PROGRAMS) {
    if (!p.id || !p.org || !p.program || !p.url || !p.gives || !p.unlocks) {
      issues.push({
        code: "program_incomplete",
        message: `Programme ${p.id || "?"} missing fields.`,
      });
    }
    if (!/^https:\/\//i.test(p.url)) {
      issues.push({ code: "program_url", message: `${p.id} apply URL must be https.` });
    }
    if (!["apply-now", "needs-traction", "unverified"].includes(p.status)) {
      issues.push({ code: "program_status", message: `${p.id} has unknown status.` });
    }
  }

  for (const id of GRANT_PRIORITY_IDS) {
    if (!ids.has(id)) {
      issues.push({ code: "priority_orphan", message: `Priority id ${id} not in PROGRAMS.` });
    }
  }

  const a = grantAnswers(t);
  for (const key of [
    "oneLiner",
    "words250",
    "words1000",
    "architecture",
    "tractionLine",
  ] as const) {
    if (!a[key] || a[key].trim().length < 20) {
      issues.push({ code: "answer_short", message: `grantAnswers.${key} too short.` });
    }
  }
  if (/waitlist of \d{2,}|\$\d+k ARR|guaranteed/i.test(a.words1000)) {
    issues.push({ code: "honesty", message: "Long form looks like invented traction language." });
  }
  if (!a.contactEmail.includes("@") || !a.website.startsWith("https://")) {
    issues.push({ code: "contact", message: "Contact email or website invalid." });
  }

  const drafts = grantOutreachDrafts(t);
  if (drafts.length === 0) {
    issues.push({ code: "drafts_empty", message: "No apply-now outreach drafts." });
  }
  for (const d of drafts) {
    if (!d.applyUrl.startsWith("https://") || d.body.length < 80) {
      issues.push({ code: "draft_weak", message: `Draft ${d.programId} incomplete.` });
    }
  }

  if (!PITCH.oneLine.toLowerCase().includes("aura")) {
    issues.push({ code: "pitch", message: "Standing pitch missing Aura." });
  }

  if (!GRANT_VIDEO_SCRIPT.includes("0:00") || !GRANT_VIDEO_SCRIPT.includes("/grants")) {
    issues.push({
      code: "video_script",
      message: "Grant video script missing timing or /grants CTA.",
    });
  }

  return { ok: issues.length === 0, issues };
}
