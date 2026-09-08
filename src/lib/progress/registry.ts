import { COMPANY_QUESTS, GROWTH_STARTER_QUESTS, TRADING_QUESTS } from "@/lib/gamify";

/** Contribution REP — earned from verified events only. Not purchasable. */
export type RepRule = {
  eventKey: string;
  rep: number;
  label: string;
  hint: string;
};

/**
 * REP v1 earn rules. Separate from `companies.reputation` (ops score 0–100)
 * and from the Local SaaS product "Aura Reputation" (see i18n `localProduct.*`).
 */
export const REP_EARN_RULES: RepRule[] = [
  {
    eventKey: "portal:checkin",
    rep: 5,
    label: "Confirmed check-in",
    hint: "Guest visit verified by shop owner",
  },
  {
    eventKey: "portal:discovered",
    rep: 8,
    label: "Portal discovered",
    hint: "Found an AURA Portal in the city",
  },
  {
    eventKey: "mission:complete",
    rep: 12,
    label: "Mission settled",
    hint: "Closed a revenue mission with honest actuals",
  },
  {
    eventKey: "scout:business",
    rep: 25,
    label: "Scout onboarding",
    hint: "Verified local business seat attributed to you",
  },
  {
    eventKey: "scout:joined",
    rep: 10,
    label: "Joined Scouts",
    hint: "Enrolled in the Vienna scout program",
  },
  {
    eventKey: "company:spin",
    rep: 3,
    label: "Daily wheel",
    hint: "Showed up and spun",
  },
  {
    eventKey: "squad:created",
    rep: 15,
    label: "Founded a squad",
    hint: "Started a crew others can join",
  },
  {
    eventKey: "squad:joined",
    rep: 12,
    label: "Joined a squad",
    hint: "Teamed up with other founders",
  },
  {
    eventKey: "squad:task",
    rep: 8,
    label: "Squad task closed",
    hint: "Completed a shared crew task",
  },
  {
    eventKey: "squad:post",
    rep: 5,
    label: "Squad update",
    hint: "Posted progress to your crew",
  },
  {
    eventKey: "growth:social-post",
    rep: 6,
    label: "Social growth task",
    hint: "Closed a social / Channels growth task for the crew",
  },
  {
    eventKey: "growth:space-showup",
    rep: 8,
    label: "Space show-up",
    hint: "Showed up on an Aura X Space for growth",
  },
  {
    eventKey: "growth:scout-share",
    rep: 5,
    label: "Scout invite shared",
    hint: "Shared a Scout /lokal?ref invite into the growth loop",
  },
  {
    eventKey: "tickpix:mint",
    rep: 8,
    label: "Took a Tickpix seat",
    hint: "Verified Tickpix hold on a linked Robinhood Chain wallet",
  },
  {
    eventKey: "tickpix:clock-in",
    rep: 2,
    label: "Clocked in on the tape",
    hint: "Showed up for daily clock-in on nft.aibusiness.fun",
  },
  {
    eventKey: "tickpix:share-tape",
    rep: 4,
    label: "Shared a tape card",
    hint: "Printed and shared a Tickpix tape card",
  },
];

export type QuestMission = {
  key: string;
  label: string;
  hint: string;
  glyph: string;
  xp: number;
  rep?: number;
  cadence: "daily" | "weekly" | "once";
};

const repFor = (eventKey: string) => REP_EARN_RULES.find((r) => r.eventKey === eventKey)?.rep ?? 0;

/** Unified quest registry for the /quest hub. */
const BASE_QUESTS = [
  ...COMPANY_QUESTS.filter((q) => q.key !== "company:spin").map((q) => ({
    key: q.key,
    label: q.label,
    hint: q.hint,
    glyph: q.glyph,
    xp: q.xp,
    rep: repFor(q.key),
    cadence: "once" as const,
  })),
  ...GROWTH_STARTER_QUESTS.map((q) => ({
    key: q.key,
    label: q.label,
    hint: q.hint,
    glyph: q.glyph,
    xp: q.xp,
    rep: 0,
    cadence: "once" as const,
  })),
  ...TRADING_QUESTS.map((q) => ({
    key: q.key,
    label: q.label,
    hint: q.hint,
    glyph: q.glyph,
    xp: q.xp,
    rep: repFor(q.key),
    cadence: "once" as const,
  })),
  {
    key: "company:spin",
    label: "Daily spin",
    hint: "Claim today's wheel drop",
    glyph: "◍",
    xp: 80,
    rep: 3,
    cadence: "daily",
  },
  {
    key: "portal:checkin",
    label: "City check-in",
    hint: "Visit a partner — owner confirms at the counter",
    glyph: "🏛",
    xp: 40,
    rep: 5,
    cadence: "weekly",
  },
  {
    key: "scout:joined",
    label: "Join Scouts",
    hint: "Help onboard Vienna locals — earn REP when seats verify",
    glyph: "🟣",
    xp: 120,
    rep: 10,
    cadence: "once",
  },
  {
    key: "squad:created",
    label: "Found a squad",
    hint: "Start a crew of 2–8 founders on Community",
    glyph: "👥",
    xp: 100,
    rep: 15,
    cadence: "once",
  },
  {
    key: "squad:joined",
    label: "Join a squad",
    hint: "Enter a 6-character invite code on Community",
    glyph: "🤝",
    xp: 80,
    rep: 12,
    cadence: "once",
  },
  {
    key: "community:follow-x",
    label: "Follow on X",
    hint: "Follow @buildingcultu3 — post the Quest + Squads ship",
    glyph: "⌁",
    xp: 80,
    rep: 0,
    cadence: "once",
  },
  {
    key: "community:join-discord",
    label: "Join Discord",
    hint: "Enter the Ninty server — drop your squad invite",
    glyph: "◈",
    xp: 120,
    rep: 0,
    cadence: "once",
  },
  {
    key: "community:join-telegram",
    label: "Join Telegram",
    hint: "Get launch updates — share a world-pulse win",
    glyph: "▲",
    xp: 120,
    rep: 0,
    cadence: "once",
  },
  {
    key: "community:follow-farcaster",
    label: "Follow on Farcaster",
    hint: "Follow 0xleonardo — cast your first quest badge",
    glyph: "◎",
    xp: 80,
    rep: 0,
    cadence: "once",
  },
  {
    key: "community:open-quest",
    label: "Open Quest hub",
    hint: "Hit /quest — claim daily spin + next badge",
    glyph: "🎮",
    xp: 60,
    rep: 0,
    cadence: "once",
  },
  {
    key: "growth:social-post",
    label: "Ship a social growth task",
    hint: "Close a social_post or Channels task on Community — paste proof URL",
    glyph: "⌁",
    xp: 40,
    rep: 6,
    cadence: "weekly",
  },
  {
    key: "growth:space-showup",
    label: "Show up on an X Space",
    hint: "Join the live Space, drop /quest, mark the Spaces task done",
    glyph: "◎",
    xp: 50,
    rep: 8,
    cadence: "weekly",
  },
  {
    key: "growth:scout-share",
    label: "Share a Scout invite",
    hint: "Post your /lokal?ref code — seats you bring pay into REP",
    glyph: "🟣",
    xp: 35,
    rep: 5,
    cadence: "weekly",
  },
  {
    key: "tickpix:mint",
    label: "Take a Tickpix seat",
    hint: "Mint at nft.aibusiness.fun · link that wallet · claim Pit badge",
    glyph: "▣",
    xp: 100,
    rep: 8,
    cadence: "once",
  },
  {
    key: "tickpix:clock-in",
    label: "Clock in on the tape",
    hint: "One ping per UTC day on the Tickpix contract — showing up is the scarce thing",
    glyph: "⏱",
    xp: 25,
    rep: 2,
    cadence: "daily",
  },
  {
    key: "tickpix:share-tape",
    label: "Share a tape card",
    hint: "Print a Tickpix tape card and post it — meme engine for the pit",
    glyph: "🖨",
    xp: 40,
    rep: 4,
    cadence: "weekly",
  },
];

export const QUEST_REGISTRY: QuestMission[] = BASE_QUESTS;

export const DAILY_QUEST_KEYS = QUEST_REGISTRY.filter((q) => q.cadence === "daily").map((q) => q.key);
export const WEEKLY_QUEST_KEYS = QUEST_REGISTRY.filter((q) => q.cadence === "weekly").map((q) => q.key);

export function questByKey(key: string): QuestMission | undefined {
  return QUEST_REGISTRY.find((q) => q.key === key);
}

export function repForEvent(eventKey: string): number {
  return repFor(eventKey);
}
