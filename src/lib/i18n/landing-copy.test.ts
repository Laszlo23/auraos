import { describe, expect, it } from "vitest";

import { de } from "./de";
import { en } from "./en";

function landing(tree: typeof en | typeof de) {
  const block = tree.landing;
  if (!block || typeof block === "string") {
    throw new Error("landing missing");
  }
  return block;
}

describe("landing copy", () => {
  it("does not let leftover story keys overwrite homepage problem/twist", () => {
    const enL = landing(en);
    const deL = landing(de);
    expect(enL.act2Body).toMatch(/Instagram/);
    expect(enL.act3Body).toMatch(/You approve spend/);
    expect(deL.act2Body).toMatch(/Instagram/);
    expect(deL.act3Body).toMatch(/genehmigst/);
    expect(enL.act2Story).toMatch(/Wake the team|You give one mission/i);
    expect(deL.act2Story).toMatch(/eine Mission/);
  });
});
