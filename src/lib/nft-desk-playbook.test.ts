import { describe, expect, it } from "vitest";

import { NFT_DESK_HARD_NO, NFT_DESK_STRATEGIES } from "@/lib/nft-desk-playbook";
import {
  hoodCollectionMetadata,
  hoodOpenSeaCollectionUrl,
  openSeaCompatChecks,
} from "@/lib/opensea-compat";
import { TRADING_PRESETS, presetById } from "@/lib/trading/presets";

describe("nft desk playbook", () => {
  it("never frames Hood or peg as equity / Tesla shares", () => {
    const blob = [
      NFT_DESK_HARD_NO.en,
      ...NFT_DESK_STRATEGIES.flatMap((s) => [s.not.en, s.how.en, s.title.en, s.trainHint.en]),
    ].join("\n");
    expect(blob).toMatch(/not equity|Not equity|not a Tesla|not wrapped|not live/i);
    expect(blob.toLowerCase()).not.toMatch(/owns tesla shares|redeem for stock|guaranteed apy/);
  });

  it("covers live, after-audit, and compat strategies", () => {
    const statuses = new Set(NFT_DESK_STRATEGIES.map((s) => s.status));
    expect(statuses.has("live")).toBe(true);
    expect(statuses.has("after-audit")).toBe(true);
    expect(statuses.has("compat")).toBe(true);
  });
});

describe("opensea compat", () => {
  it("rejects inventing a collection URL when env is empty", () => {
    expect(hoodOpenSeaCollectionUrl()).toBeNull();
  });

  it("exposes self-hosted metadata checks as ready", () => {
    const checks = openSeaCompatChecks();
    expect(checks.find((c) => c.id === "metadata")?.ok).toBe(true);
    expect(checks.find((c) => c.id === "collection-meta")?.ok).toBe(true);
  });

  it("collection metadata states no equity / no share claim", () => {
    const meta = hoodCollectionMetadata();
    expect(meta.description.toLowerCase()).toMatch(/not equity/);
    expect(meta.description.toLowerCase()).toMatch(/not a tesla\/share claim|not a tesla/);
  });
});

describe("quant history presets", () => {
  it("includes peg_momentum and founding_desk for walk-forward training", () => {
    expect(presetById("peg_momentum")?.spec.symbols).toEqual(["WETH/USDC"]);
    expect(presetById("founding_desk")?.riskLabel).toBe("Low");
    expect(TRADING_PRESETS.some((p) => p.id === "peg_momentum")).toBe(true);
  });

  it("peg prompt refuses stock and NFT fills", () => {
    const prompt = presetById("peg_momentum")!.prompt.toLowerCase();
    expect(prompt).toMatch(/not tesla shares/);
    expect(prompt).toMatch(/not nfts/);
  });
});
