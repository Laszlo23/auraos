import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import { DIDIT_WORKFLOW_ID } from "./didit-workflow";
import {
  classifyDiditSessionFailure,
  canonicalDiditWebhookBody,
  diditEventDedupeKey,
  extractDiditWebhookSession,
  mapDiditStatus,
  verifyDiditWebhook,
} from "./didit.server";
import { isKycApproved } from "./kyc-status";

describe("Didit workflow id", () => {
  it("is a non-secret constant, not an env lookup", () => {
    expect(DIDIT_WORKFLOW_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("Didit session errors", () => {
  it("maps a credit failure", () => {
    const err = classifyDiditSessionFailure(
      400,
      '{"detail":"You don\'t have enough credits to perform this request."}',
    );
    expect(err.code).toBe("credits");
  });
});

describe("Didit status map", () => {
  it("maps exact Didit literals only", () => {
    expect(mapDiditStatus("Approved")).toBe("approved");
    expect(mapDiditStatus("APPROVED")).toBe("in_progress");
    expect(mapDiditStatus("In Progress")).toBe("in_progress");
    expect(mapDiditStatus("Awaiting User")).toBe("awaiting_user");
    expect(mapDiditStatus("In Review")).toBe("in_review");
    expect(mapDiditStatus("Declined")).toBe("declined");
    expect(mapDiditStatus("Resubmitted")).toBe("resubmitted");
    expect(mapDiditStatus("Abandoned")).toBe("abandoned");
    expect(mapDiditStatus("Expired")).toBe("expired");
    expect(mapDiditStatus("Kyc Expired")).toBe("kyc_expired");
    expect(mapDiditStatus("Not Started")).toBe("not_started");
    expect(isKycApproved("approved")).toBe(true);
    expect(isKycApproved("in_review")).toBe(false);
  });
});

describe("Didit webhook verify", () => {
  const secret = "test-webhook-secret";
  const body = {
    event_id: "evt-1",
    webhook_type: "status.updated",
    timestamp: 1757664000,
    session_id: "sess-1",
    vendor_data: "user-1",
    status: "Approved",
    workflow_id: DIDIT_WORKFLOW_ID,
  };

  it("accepts X-Signature-V2 over canonical JSON", () => {
    const sig = createHmac("sha256", secret)
      .update(canonicalDiditWebhookBody(body), "utf8")
      .digest("hex");
    expect(
      verifyDiditWebhook({
        jsonBody: body,
        signatureV2: sig,
        timestamp: "1757664000",
        secret,
        nowSec: 1757664000,
      }),
    ).toBe(true);
  });

  it("rejects stale timestamps", () => {
    const sig = createHmac("sha256", secret)
      .update(canonicalDiditWebhookBody(body), "utf8")
      .digest("hex");
    expect(
      verifyDiditWebhook({
        jsonBody: body,
        signatureV2: sig,
        timestamp: "100",
        secret,
        nowSec: 1757664000,
      }),
    ).toBe(false);
  });

  it("rejects a bad signature", () => {
    expect(
      verifyDiditWebhook({
        jsonBody: body,
        signatureV2: "0".repeat(64),
        timestamp: "1757664000",
        secret,
        nowSec: 1757664000,
      }),
    ).toBe(false);
  });

  it("reads V3 root fields and event_id", () => {
    expect(extractDiditWebhookSession(body)).toEqual({
      eventId: "evt-1",
      sessionId: "sess-1",
      vendorData: "user-1",
      status: "Approved",
      workflowId: DIDIT_WORKFLOW_ID,
      webhookType: "status.updated",
      timestamp: 1757664000,
    });
    expect(diditEventDedupeKey(extractDiditWebhookSession(body))).toBe("evt-1");
  });

  it("falls back to compound key when event_id is missing", () => {
    const { event_id: _, ...rest } = body;
    expect(diditEventDedupeKey(extractDiditWebhookSession(rest))).toBe(
      "sess-1:status.updated:1757664000",
    );
  });
});
