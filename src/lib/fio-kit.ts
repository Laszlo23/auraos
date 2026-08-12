import { LEGAL_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { fioPreferredDomain, fioTpid } from "@/lib/fio";

/** Outreach + one-pager content for FIO Foundation collab. */
export const FIO_PARTNER_ASKS = [
  {
    title: "Free handles on our domain",
    body: `Fund initial FIO Handles on @${fioPreferredDomain()} for founding seats and Lokal businesses — users still own mappings; we never custody FIO keys.`,
  },
  {
    title: "Listing + co-marketing",
    body: "Joint announcement, utilization contest (attest FIO → enter), and Foundation channel amplification when we ship receive-by-handle in Wallet.",
  },
  {
    title: "Registration Website / API",
    body: "In-app register path (today we deep-link to FIO App) so founders claim name@domain without leaving Aura OS.",
  },
  {
    title: "Optional: FIO Request",
    body: "Pay-this-mission / Boost top-ups addressed to a FIO handle — after resolve + attest stay rock solid.",
  },
] as const;

export const FIO_SHIPPED = [
  "Resolve FIO → public address (ETH / Base / BSC + USDC) with API failover",
  "Attest FIO only against signature-verified wallets (mapping must match)",
  "Public profile shows verified FIO (`/u/$handle`)",
  "Public resolve server fn for partners (`resolveFioPublic`)",
  "Soft-gate: Identity nudge + USDC send / live Grow / Quant arm prompts",
] as const;

export function fioPartnerEmailDraft(): string {
  const domain = fioPreferredDomain();
  const tpid = fioTpid() || "(pending — registering integrator handle)";
  return `Subject: Aura OS × FIO — integration live, partnership ask

Hi FIO Partnerships team,

Aura OS (https://aibusiness.fun) is an operating system for AI companies: agents do real work, founders approve sends, and money moves on Base/ETH smart accounts.

We already ship FIO as our primary crypto-handle rail (in-app @handles stay for social/leaderboard):

• Resolve + attest FIO to verified wallets
• Public profiles show FIO
• Partner-ready resolve API
• Soft-require FIO before USDC send / live trading & yield

Demo: ${SITE_URL}/partners/fio
Product Identity: ${SITE_URL}/identity
Docs: ${SITE_URL} (see /partners/fio kit)

Asks:
1. Free handles on @${domain} for founding / Lokal seats
2. Listing + co-marketing / utilization contest
3. Registration Website or API access
4. Optional later: FIO Request for mission/Boost pays

Our TPID (fee share): ${tpid}

Happy to jump on a call or sign an MOU.

— ${SITE_NAME}
${LEGAL_EMAIL}
`;
}

export function fioKitMarkdown(): string {
  const domain = fioPreferredDomain();
  return `# ${SITE_NAME} × FIO Protocol — partner kit

Live: ${SITE_URL}/partners/fio
Contact: ${LEGAL_EMAIL}

## What we shipped
${FIO_SHIPPED.map((s) => `- ${s}`).join("\n")}

## Asks
${FIO_PARTNER_ASKS.map((a) => `### ${a.title}\n${a.body}`).join("\n\n")}

## Preferred domain
\`@${domain}\`

## TPID
\`${fioTpid() || "set FIO_TPID after registering integrator handle"}\`

## Values
Honest utility (send/receive), founder agency (no silent sends, no custodial FIO keys), Local + global founders.
`;
}
