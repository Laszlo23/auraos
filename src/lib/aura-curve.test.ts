import { describe, expect, it } from "vitest";

import {
  AURA_AIRDROP_ONLY,
  AURA_CURVE_COPY,
  AURA_CURVE_ENGINE,
  AURA_DEV_BUY_USDC,
  AURA_LP_BOOK_USDC,
  AURA_LP_DRIP_AURA,
  AURA_LP_FAR_AURA,
  AURA_LP_NEAR_AURA,
  AURA_LP_START_PRICE_USD,
  AURA_NOT_PROMISED,
  AURA_OFFICIAL_PAIRS,
  AURA_REWARD_SPLIT_BPS,
  AURA_REWARD_SPLIT_TOTAL_BPS,
  AURA_SWAP_BURN_BPS,
  AURA_SWAP_BURN_BPS_MAX,
  AURA_SWAP_BURN_BPS_MIN,
  AURA_T0_TREASURY_USDC,
  AURA_UTILITY_BURN_CAP_BPS,
  assertAuraCurveRules,
  auraBurnSinkAddress,
  auraGaugeAddress,
  auraOfficialCaRows,
  auraPoolUsdcId,
  auraPoolWethId,
  auraRhWrapperAddress,
  formatBps,
  readConfiguredHexId,
} from "@/lib/aura-curve";
import { AURA_TOKEN_CA, AURA_TOKEN_SYMBOL } from "@/lib/aura-token";
import { AURA_T0_VENUE, buildAuraPlatformTgeSpec } from "@/lib/aura-t0-clanker";

const ZERO = "0x0000000000000000000000000000000000000001" as const;

describe("AURA curve SSOT", () => {
  it("keeps the published rule pack", () => {
    expect(() => assertAuraCurveRules()).not.toThrow();
    expect(AURA_REWARD_SPLIT_TOTAL_BPS).toBe(10_000);
    expect(AURA_REWARD_SPLIT_BPS).toEqual({
      lpStakers: 5000,
      protocolSink: 2500,
      burn: 1500,
      questBonus: 1000,
    });
    expect(AURA_SWAP_BURN_BPS).toBeGreaterThanOrEqual(AURA_SWAP_BURN_BPS_MIN);
    expect(AURA_SWAP_BURN_BPS).toBeLessThanOrEqual(AURA_SWAP_BURN_BPS_MAX);
    expect(AURA_UTILITY_BURN_CAP_BPS).toBeLessThan(10_000);
    expect(AURA_CURVE_ENGINE.positions).toBe("FlatStart");
    expect(AURA_CURVE_ENGINE.clankerPositions).toBe("Standard");
    expect(AURA_CURVE_ENGINE.bands).toBe(3);
    expect(AURA_CURVE_ENGINE.feePreset).toBe("Dynamic3");
    expect(AURA_DEV_BUY_USDC).toBe(1111);
    expect(AURA_LP_BOOK_USDC).toBe(6000);
    expect(AURA_T0_TREASURY_USDC).toBe(7111);
    expect(AURA_LP_START_PRICE_USD).toBe(0.001);
    expect(AURA_LP_NEAR_AURA + AURA_LP_DRIP_AURA + AURA_LP_FAR_AURA).toBe(46_666_667);
    expect(AURA_CURVE_COPY.officialSeed).toMatch(/1,111/);
    expect(AURA_CURVE_COPY.startingBook).toMatch(/6,000/);
    expect(AURA_CURVE_COPY.tokenTaxZero).toMatch(/Token tax 0%/);
    expect(AURA_CURVE_COPY.youCanSell).toMatch(/You can sell/i);
    expect(AURA_CURVE_COPY.venue).toMatch(/Uniswap v4/i);
    expect(AURA_CURVE_COPY.lpLock).toMatch(/locked/i);
    expect(AURA_CURVE_COPY.lpLock).not.toMatch(/AuraLpSink/i);
  });

  it("has one official T-0 book and a later WETH pool, same token", () => {
    expect(AURA_OFFICIAL_PAIRS.map((p) => p.id)).toEqual(["aura-usdc", "aura-weth"]);
    expect(AURA_OFFICIAL_PAIRS[0]?.officialBook).toBe(true);
    expect(AURA_OFFICIAL_PAIRS[1]?.officialBook).toBe(false);
    expect(AURA_TOKEN_SYMBOL).toBe("AURA");
    expect(AURA_AIRDROP_ONLY).toHaveLength(2);
    expect(AURA_NOT_PROMISED.some((line) => /TICKPIX ERC-20/i.test(line))).toBe(true);
  });

  it("leaves every T-0 CA unpublished", () => {
    expect(AURA_TOKEN_CA).toBeNull();
    expect(auraPoolUsdcId()).toBeNull();
    expect(auraPoolWethId()).toBeNull();
    expect(auraGaugeAddress()).toBeNull();
    expect(auraBurnSinkAddress()).toBeNull();
    expect(auraRhWrapperAddress()).toBeNull();
    const rows = auraOfficialCaRows({ token: null, treasury: null });
    expect(rows.every((r) => r.value === null)).toBe(true);
    expect(rows.some((r) => r.id === "rh-wrapper" && r.t0 === false)).toBe(true);
  });

  it("accepts a Uni v4 pool id or a 20-byte address", () => {
    expect(readConfiguredHexId("not-hex")).toBeNull();
    expect(readConfiguredHexId(` ${ZERO} `)).toBe(ZERO);
    expect(
      readConfiguredHexId("0x" + "ab".repeat(32)),
    ).toBe("0x" + "ab".repeat(32));
  });

  it("formats bps for the trust surface", () => {
    expect(formatBps(15)).toBe("0.15%");
    expect(formatBps(5000)).toBe("50%");
  });
});

describe("platform TGE spec (no deploy)", () => {
  it("pairs USDC with the published reward split and is not the company desk", () => {
    const spec = buildAuraPlatformTgeSpec({
      tokenAdmin: ZERO,
      protocolSink: ZERO,
      burnSink: ZERO,
      questBonus: ZERO,
      lpStakerRecipient: ZERO,
    });
    expect(spec["symbol"]).toBe("AURA");
    expect((spec["pool"] as { pairedToken: string }).pairedToken).toBe("USDC");
    expect((spec["pool"] as { positions: string; intendedPositions: string; bookUsdc: string }).positions).toBe(
      "Standard",
    );
    expect((spec["pool"] as { intendedPositions: string }).intendedPositions).toBe("FlatStart");
    expect((spec["pool"] as { bookUsdc: string }).bookUsdc).toBe("6000");
    expect((spec["context"] as { notCompanyDesk: boolean }).notCompanyDesk).toBe(true);
    expect((spec["context"] as { createFactoryToken: boolean }).createFactoryToken).toBe(false);
    expect(spec["createFactoryToken"]).toBe(false);
    expect(spec["factoryTokenForbidden"]).toBe("ClankerTokenV4");
    expect(String(spec["signingNote"])).toMatch(/AuraToken\.sol/);
    const wrapped = buildAuraPlatformTgeSpec({
      tokenAdmin: ZERO,
      protocolSink: ZERO,
      burnSink: ZERO,
      questBonus: ZERO,
      lpStakerRecipient: ZERO,
      auraToken: ZERO,
    });
    expect(wrapped["auraToken"]).toBe(ZERO);
    expect(wrapped["createFactoryToken"]).toBe(false);
    expect(AURA_T0_VENUE.wrapExisting).toBe(true);
    expect(AURA_T0_VENUE.factoryTokenForbidden).toBe("ClankerTokenV4");
    const recipients = (spec["rewards"] as { recipients: Array<{ bps: number }> }).recipients;
    expect(recipients.reduce((s, r) => s + r.bps, 0)).toBe(10_000);
  });
});
