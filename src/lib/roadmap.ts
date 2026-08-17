/**
 * Public roadmap — product truth + Ninty community rituals.
 * Funny on purpose. Phases match the investor deck; vibes are extra.
 */

import { TOKEN_LAUNCH_DISPLAY } from "@/lib/site";

export type RoadmapStatus = "live" | "brewing" | "next" | "dreaming";

export type RoadmapStop = {
  id: string;
  when: string;
  title: string;
  joke: string;
  body: string;
  status: RoadmapStatus;
  kind: "product" | "love" | "coffee" | "space";
};

export const ROADMAP_INTRO = {
  eyebrow: "Roadmap · with oat milk",
  title: "Aura OS — the love way",
  subtitle:
    "We ship product like adults and community like people who actually like each other. Coffee sessions, Spaces, and the occasional soft launch of feelings.",
} as const;

export const ROADMAP_STOPS: RoadmapStop[] = [
  {
    id: "phase-1",
    when: "Now",
    title: "Working product (live)",
    joke: "The OS already shows up to work. You can too — or don’t. Agents don’t judge… publicly.",
    body: "Command center, AI workforce, missions, proof-of-work, memory, wallet, trading & yield infra. Phase 1 is not a slide — it’s running.",
    status: "live",
    kind: "product",
  },
  {
    id: "coffee-office",
    when: "Weekly",
    title: "Coffee sessions",
    joke: "Bring a mug. Leave with a mission. Spill optional; screenshots forbidden if it’s gossip.",
    body: "Open hangouts for founders + builders — demos, rants, and “why is my agent arguing with Ledger again?” energy. No pitch theater.",
    status: "live",
    kind: "coffee",
  },
  {
    id: "love-spaces",
    when: "Biweekly",
    title: "Love Spaces",
    joke: "Audio rooms where we talk product, tokens, and why autonomy still needs a human with a heart.",
    body: "Live Spaces on X / community rooms: roadmap teasers, agent war stories, fair-launch Q&A. Soft voices. Sharp questions.",
    status: "brewing",
    kind: "space",
  },
  {
    id: "fair-launch",
    when: TOKEN_LAUNCH_DISPLAY,
    title: "Fair launch day",
    joke: "No surprise CA. Official channels announce T-0 48 hours ahead.",
    body: "Ecosystem token layer goes live with the published ops plan — product subscriptions stay the business. Targets ≠ guarantees.",
    status: "next",
    kind: "love",
  },
  {
    id: "phase-2",
    when: "Next",
    title: "Commercial validation",
    joke: "Fewer features. More invoices that clear.",
    body: "First paying companies, settled revenue, retention, case studies. The 90-day mission is proof — not roadmap fan fiction.",
    status: "next",
    kind: "product",
  },
  {
    id: "coffee-tour",
    when: "Seasonal",
    title: "City coffee tour",
    joke: "Vienna first. Then wherever the espresso and the founders agree.",
    body: "IRL pop-ups: laptop-optional meetups, sticky-note roadmaps, and one sacred rule — no slide decks longer than a cortado lasts.",
    status: "dreaming",
    kind: "coffee",
  },
  {
    id: "phase-3",
    when: "Scale",
    title: "100 → 1,000 companies",
    joke: "Marketplace enters the chat. Agents start networking without LinkedIn.",
    body: "Marketplace, agent economy, advanced API. Companies hire each other’s specialists. Still: founder approvals, still: proof.",
    status: "dreaming",
    kind: "product",
  },
  {
    id: "phase-4",
    when: "Horizon",
    title: "Autonomous network",
    joke: "Thousands of AI-native companies. Inter-company economy. Somehow still time for coffee.",
    body: "Global agent marketplace + company-to-company rails. The moat is memory, orchestration, and economic truth — not a louder token.",
    status: "dreaming",
    kind: "product",
  },
];

export const NINETY_DAY = {
  title: "90-day mission (the serious bit)",
  line: "More features are not the milestone. Paying companies and settled revenue are.",
  beats: [
    { d: "0–30", t: "1–10 paying companies" },
    { d: "30–60", t: "10–50 customers" },
    { d: "60–90", t: "50–100+ companies" },
  ],
} as const;

export const LOVE_RITUALS = [
  {
    id: "coffee",
    title: "Coffee sessions",
    blurb: "Weekly hang · mug required · ego optional",
    cta: "Watch Discord for the next brew",
  },
  {
    id: "spaces",
    title: "Love Spaces",
    blurb: "Biweekly audio · roadmap + rants + Q&A",
    cta: "Follow @buildingcultu3 for drops",
  },
  {
    id: "letters",
    title: "Love notes from agents",
    blurb: "Proof cards that read like postcards from the company",
    cta: "Share a proof · steal the caption",
  },
] as const;

/** Funny chart: vibes vs features (illustrative, not metrics). */
export const VIBES_CHART = [
  { label: "Q2", features: 40, vibes: 55, love: 30 },
  { label: "Now", features: 72, vibes: 68, love: 70 },
  { label: "Launch", features: 78, vibes: 88, love: 92 },
  { label: "Scale", features: 90, vibes: 85, love: 95 },
] as const;
