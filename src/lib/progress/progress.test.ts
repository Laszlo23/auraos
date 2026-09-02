import { describe, expect, it } from "vitest";

import {
  GENESIS_TIER_MAX,
  HOOD_MAX_SUPPLY,
  genesisNumberFromHoodTokenId,
  isGenesisTier,
} from "@/lib/progress/genesis";
import { DAILY_QUEST_KEYS, QUEST_REGISTRY, REP_EARN_RULES, repForEvent } from "@/lib/progress/registry";

describe("genesis policy", () => {
  it("keeps Hood supply at 1000 on-chain", () => {
    expect(HOOD_MAX_SUPPLY).toBe(1000);
    expect(GENESIS_TIER_MAX).toBe(777);
  });

  it("maps Hood tokenIds 1-777 to genesis tier", () => {
    expect(genesisNumberFromHoodTokenId(1)).toBe(1);
    expect(genesisNumberFromHoodTokenId(777)).toBe(777);
    expect(genesisNumberFromHoodTokenId(778)).toBeNull();
    expect(isGenesisTier(500)).toBe(true);
    expect(isGenesisTier(800)).toBe(false);
  });
});

describe("quest registry", () => {
  it("includes daily spin quest", () => {
    expect(DAILY_QUEST_KEYS).toContain("company:spin");
    const spin = QUEST_REGISTRY.find((q) => q.key === "company:spin");
    expect(spin?.cadence).toBe("daily");
  });

  it("defines REP only for verified events", () => {
    expect(repForEvent("portal:checkin")).toBe(5);
    expect(repForEvent("scout:business")).toBe(25);
    expect(repForEvent("squad:task")).toBe(8);
    expect(REP_EARN_RULES.every((r) => r.rep > 0)).toBe(true);
  });

  it("includes squad collaboration quests", () => {
    expect(QUEST_REGISTRY.some((q) => q.key === "squad:created")).toBe(true);
    expect(QUEST_REGISTRY.some((q) => q.key === "squad:joined")).toBe(true);
  });

  it("includes community social quests", () => {
    for (const key of [
      "community:follow-x",
      "community:join-discord",
      "community:join-telegram",
      "community:follow-farcaster",
      "community:open-quest",
    ]) {
      expect(QUEST_REGISTRY.some((q) => q.key === key)).toBe(true);
    }
  });
});
