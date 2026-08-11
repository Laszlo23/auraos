import { describe, expect, it } from "vitest";

import { taskStatusForAutonomy } from "@/lib/company-economy";

describe("taskStatusForAutonomy", () => {
  it("Manual always gates", () => {
    expect(taskStatusForAutonomy({ autonomy: 0, founderApproved: true })).toBe(
      "pending_approval",
    );
  });

  it("Assisted queues when founder-approved", () => {
    expect(taskStatusForAutonomy({ autonomy: 1, founderApproved: true })).toBe("queued");
    expect(taskStatusForAutonomy({ autonomy: 1, founderApproved: false })).toBe(
      "pending_approval",
    );
  });

  it("Supervised queues founder-approved only", () => {
    expect(taskStatusForAutonomy({ autonomy: 2, founderApproved: true })).toBe("queued");
    expect(taskStatusForAutonomy({ autonomy: 2, founderApproved: false })).toBe(
      "pending_approval",
    );
  });
});
