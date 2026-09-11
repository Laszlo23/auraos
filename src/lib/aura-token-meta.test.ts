import { describe, expect, it } from "vitest";

import { AURA_DEV_BUY_USDC } from "@/lib/aura-curve";
import {
  AURA_TOKEN_DESCRIPTION,
  AURA_TOKEN_WEBSITE,
  auraClankerMetadata,
  auraDexscreenerLinks,
  auraTokenImageUrl,
  auraTokenMetaJson,
  auraTokenOgUrl,
  auraTokenSocials,
} from "@/lib/aura-token-meta";
import { AURA_TOKEN_NAME, AURA_TOKEN_SYMBOL } from "@/lib/aura-token";
import { buildAuraPlatformTgeSpec } from "@/lib/aura-t0-clanker";

const ZERO = "0x0000000000000000000000000000000000000001" as const;

describe("AURA token metadata", () => {
  it("publishes logo, weblinks, and socials without inventing a CA", () => {
    const json = auraTokenMetaJson();
    expect(json.name).toBe(AURA_TOKEN_NAME);
    expect(json.symbol).toBe(AURA_TOKEN_SYMBOL);
    expect(json.description).toBe(AURA_TOKEN_DESCRIPTION);
    expect(json.image).toMatch(/\/brand\/aura-mark\.png$/);
    expect(json.icon).toBe(json.image);
    expect(json.header).toBe(auraTokenOgUrl());
    expect(json.website).toBe(AURA_TOKEN_WEBSITE);
    expect(json.buy_tax).toBe("0");
    expect(json.sell_tax).toBe("0");
    expect(json.token_tax_bps).toBe(0);
    expect(json.pool_fee_bps).toEqual({ min: 100, max: 300 });
    expect(json.you_can_sell).toMatch(/You can sell/i);
    expect(json.links[0]?.type).toBe("website");
    expect(auraDexscreenerLinks().some((l) => l.type === "twitter")).toBe(true);
    expect(AURA_TOKEN_DESCRIPTION.length).toBeLessThanOrEqual(200);
    expect(json.address).toBeNull();
    expect(json.pool_usdc).toBeNull();
    expect(auraTokenSocials().map((s) => s.platform)).toEqual([
      "x",
      "discord",
      "telegram",
      "farcaster",
    ]);
    expect(auraTokenImageUrl()).toMatch(/^https:\/\//);
  });

  it("feeds Clanker metadata and the $1,111 seed", () => {
    const spec = buildAuraPlatformTgeSpec({
      tokenAdmin: ZERO,
      protocolSink: ZERO,
      burnSink: ZERO,
      questBonus: ZERO,
      lpStakerRecipient: ZERO,
    });
    expect(spec["image"]).toMatch(/aura-mark\.png/);
    const meta = spec["metadata"] as { description: string; socialMediaUrls: unknown[] };
    expect(meta.description).toBe(auraClankerMetadata().description);
    expect(meta.socialMediaUrls.length).toBe(4);
    expect((spec["devBuy"] as { usdcAmount: string }).usdcAmount).toBe(String(AURA_DEV_BUY_USDC));
    expect((spec["devBuy"] as { recipient: string }).recipient).toBe(ZERO);
    expect(spec["createFactoryToken"]).toBe(false);
    expect(spec["auraToken"]).toBeNull();
    expect(spec["existingToken"]).toBe(true);
    expect(spec["tokenTaxBps"]).toBe(0);
  });
});
