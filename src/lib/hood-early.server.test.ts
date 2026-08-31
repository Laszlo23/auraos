import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { normalizeHoodEarlyPass } from "@/lib/hood-early";

describe("hood early server gate", () => {
  const prevPass = process.env["HOOD_EARLY_PASS"];
  const prevHash = process.env["HOOD_EARLY_PASS_HASH"];
  const prevSecret = process.env["HOOD_EARLY_PERMIT_SECRET"];

  afterEach(() => {
    if (prevPass === undefined) delete process.env["HOOD_EARLY_PASS"];
    else process.env["HOOD_EARLY_PASS"] = prevPass;
    if (prevHash === undefined) delete process.env["HOOD_EARLY_PASS_HASH"];
    else process.env["HOOD_EARLY_PASS_HASH"] = prevHash;
    if (prevSecret === undefined) delete process.env["HOOD_EARLY_PERMIT_SECRET"];
    else process.env["HOOD_EARLY_PERMIT_SECRET"] = prevSecret;
  });

  it("accepts the normalized password and issues a verifiable permit", async () => {
    delete process.env["HOOD_EARLY_PASS_HASH"];
    process.env["HOOD_EARLY_PASS"] = "  Aura Early  Test ";
    process.env["HOOD_EARLY_PERMIT_SECRET"] = "test-permit-secret";

    const {
      hoodEarlyConfigured,
      verifyHoodEarlyPassword,
      issueHoodEarlyPermit,
      verifyHoodEarlyPermit,
    } = await import("@/lib/hood-early.server");

    expect(hoodEarlyConfigured()).toBe(true);
    expect(verifyHoodEarlyPassword("aura early test")).toBe(true);
    expect(verifyHoodEarlyPassword("wrong")).toBe(false);

    const issued = issueHoodEarlyPermit();
    expect(verifyHoodEarlyPermit(issued.permit)).toBe(true);
    expect(verifyHoodEarlyPermit("nope")).toBe(false);
  });

  it("accepts a precomputed sha256 hash", async () => {
    delete process.env["HOOD_EARLY_PASS"];
    const norm = normalizeHoodEarlyPass("Secret Invite");
    process.env["HOOD_EARLY_PASS_HASH"] = createHash("sha256").update(norm, "utf8").digest("hex");
    process.env["HOOD_EARLY_PERMIT_SECRET"] = "test-permit-secret-2";

    const { verifyHoodEarlyPassword, issueHoodEarlyPermit, verifyHoodEarlyPermit } =
      await import("@/lib/hood-early.server");

    expect(verifyHoodEarlyPassword("secret invite")).toBe(true);
    const issued = issueHoodEarlyPermit();
    expect(verifyHoodEarlyPermit(issued.permit)).toBe(true);
  });
});
