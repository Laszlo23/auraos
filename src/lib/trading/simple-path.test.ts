import { describe, expect, it } from "vitest";

import {
  plainDeskBlockReason,
  simpleTradePhase,
  type SimpleDeskReady,
} from "@/lib/trading/simple-path";

function ready(partial: SimpleDeskReady): SimpleDeskReady {
  return { hasApprovedStrategy: false, hasBacktest: false, armed: false, ...partial };
}

describe("simpleTradePhase", () => {
  it("starts at pick until a strategy exists", () => {
    expect(simpleTradePhase(undefined)).toBe("pick");
    expect(simpleTradePhase(ready({}))).toBe("pick");
    expect(simpleTradePhase(ready({ hasBacktest: true }))).toBe("start");
    expect(simpleTradePhase(ready({ hasApprovedStrategy: true, hasTradeKey: true }))).toBe("start");
  });

  it("skips the session-key step — Start issues that for you", () => {
    expect(simpleTradePhase(ready({ hasApprovedStrategy: true, hasTradeKey: false }))).toBe("start");
  });

  it("is done only when the desk is on", () => {
    expect(simpleTradePhase(ready({ hasApprovedStrategy: true, armed: true }))).toBe("done");
  });
});

describe("plainDeskBlockReason", () => {
  it("hides session-key jargon", () => {
    expect(plainDeskBlockReason("Issue a session key with Trade permission")).toBeNull();
  });

  it("plain-speaks funding and strategy blocks", () => {
    expect(plainDeskBlockReason("Deposit at least $5 USDC on Base")).toMatch(/\$5 USDC/);
    expect(plainDeskBlockReason("Approve a strategy (pick a preset)")).toMatch(/trading style/);
  });
});
