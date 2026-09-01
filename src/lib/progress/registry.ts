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
