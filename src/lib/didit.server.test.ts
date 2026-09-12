import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import {
  extractDiditWebhookSession,
  isKycApproved,
  mapDiditStatus,
  verifyDiditWebhook,
} from "./didit.server";

describe("Didit status map", () => {
  it("maps Didit labels to stored statuses", () => {
    expect(mapDiditStatus("Approved")).toBe("approved");
    expect(mapDiditStatus("APPROVED")).toBe("approved");
    expect(mapDiditStatus("In Progress")).toBe("in_progress");
    expect(mapDiditStatus("Awaiting User")).toBe("in_progress");
    expect(mapDiditStatus("In Review")).toBe("in_review");
    expect(mapDiditStatus("Declined")).toBe("declined");
    expect(mapDiditStatus("Kyc Expired")).toBe("expired");
    expect(isKycApproved("approved")).toBe(true);
    expect(isKycApproved("in_review")).toBe(false);
  });
});

describe("Didit webhook verify", () => {
  const secret = "test-webhook-secret";
  const body = {
    event: "status.updated",
    timestamp: "2026-09-12T08:00:00Z",
    data: { session_id: "sess-1", vendor_data: "user-1", status: "Approved" },
  };

  it("accepts X-Signature-V2 over canonical JSON", () => {
    const canonical = JSON.stringify({
      data: { session_id: "sess-1", status: "Approved", vendor_data: "user-1" },
      event: "status.updated",
      timestamp: "2026-09-12T08:00:00Z",
    });
    const sig = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
    expect(
      verifyDiditWebhook({
        jsonBody: body,
        rawBody: JSON.stringify(body),
        signatureV2: sig,
        signatureRaw: null,
        signatureSimple: null,
        timestamp: "1757664000",
        secret,
        nowSec: 1757664000,
      }),
    ).toBe(true);
  });

  it("rejects stale timestamps", () => {
    expect(
      verifyDiditWebhook({
        jsonBody: body,
        rawBody: "{}",
        signatureV2: "00",
        signatureRaw: null,
        signatureSimple: null,
        timestamp: "100",
        secret,
        nowSec: 1757664000,
      }),
    ).toBe(false);
  });

  it("reads session fields from nested data", () => {
    expect(extractDiditWebhookSession(body)).toEqual({
      sessionId: "sess-1",
      vendorData: "user-1",
      status: "Approved",
    });
  });
});
