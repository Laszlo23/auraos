import { describe, expect, it } from "vitest";

import {
  PREVIEW_PASS_BATCH_MAX,
  PREVIEW_PASS_CODE,
  clampPreviewBatch,
  looksLikePreviewCode,
  normalizePreviewCode,
  previewPassShareUrl,
  randomPreviewCode,
} from "./preview-pass";

describe("preview pass codes", () => {
  it("accepts the standing LOOK door and LOOK-XXXXXXXX", () => {
    expect(looksLikePreviewCode("look")).toBe(true);
    expect(looksLikePreviewCode("LOOK")).toBe(true);
    const minted = randomPreviewCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(looksLikePreviewCode(minted)).toBe(true);
    expect(normalizePreviewCode(minted.toLowerCase())).toBe(minted);
  });

  it("rejects paid-wave and junk codes", () => {
    expect(looksLikePreviewCode("")).toBe(false);
    expect(looksLikePreviewCode("WAVE-0111F34C")).toBe(false);
    expect(looksLikePreviewCode("LOOK-SHORT")).toBe(false);
    expect(looksLikePreviewCode("HOOD-ABCD2345")).toBe(false);
    expect(normalizePreviewCode("not-a-code")).toBeNull();
  });

  it("clamps a batch to 1–6", () => {
    expect(clampPreviewBatch(6)).toBe(6);
    expect(clampPreviewBatch(99)).toBe(PREVIEW_PASS_BATCH_MAX);
    expect(clampPreviewBatch(0)).toBe(1);
    expect(clampPreviewBatch("nope")).toBe(6);
  });

  it("builds a signup URL that carries the invite", () => {
    const url = previewPassShareUrl(PREVIEW_PASS_CODE);
    expect(url).toContain("/auth");
    expect(url).toContain("invite=LOOK");
    expect(url).toContain("mode=signup");
  });
});
