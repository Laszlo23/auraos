import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AURA_GOPLUS_TOKEN_ZEROS,
  AURA_POOL_FEE_BPS,
  AURA_SCANNER_COPY,
  AURA_SINK_FORBIDDEN_SURFACE,
  AURA_TOKEN_FORBIDDEN_SURFACE,
  AURA_TOKEN_TAX_BPS,
  auraExpectedGoPlusZeros,
  auraScannerPublicFacts,
  sourceHasForbiddenSurface,
} from "@/lib/aura-scanner";

function solidity(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("AURA scanner 10/10 surface", () => {
  it("freezes AuraToken with no owner, mint, tax, pause, or blacklist", () => {
    const src = solidity("contracts/aura/AuraToken.sol");
    expect(sourceHasForbiddenSurface(src, AURA_TOKEN_FORBIDDEN_SURFACE)).toEqual([]);
    expect(src).toMatch(/MAX_SUPPLY = 777_777_777 ether/);
    expect(src).toMatch(/_mint\(msg\.sender, MAX_SUPPLY\)/);
    expect(src).toMatch(/ClankerTokenV4/);
    expect(src).not.toMatch(/function mint\s*\(/);
  });

  it("keeps burn sink and gauge without admin withdraw of principal", () => {
    const sink = solidity("contracts/aura/AuraBurnSink.sol");
    const gauge = solidity("contracts/aura/AuraGauge.sol");
    expect(sourceHasForbiddenSurface(sink, AURA_SINK_FORBIDDEN_SURFACE)).toEqual([]);
    expect(sourceHasForbiddenSurface(gauge, AURA_SINK_FORBIDDEN_SURFACE)).toEqual([]);
  });

  it("publishes GoPlus zeros and pool fees separately from token tax", () => {
    const zeros = auraExpectedGoPlusZeros();
    expect(zeros).toEqual(AURA_GOPLUS_TOKEN_ZEROS);
    expect(zeros.buy_tax).toBe("0");
    expect(zeros.sell_tax).toBe("0");
    expect(AURA_TOKEN_TAX_BPS).toBe(0);
    expect(AURA_POOL_FEE_BPS).toEqual({ min: 100, max: 300 });
    const facts = auraScannerPublicFacts();
    expect(facts.createFactoryToken).toBe(false);
    expect(facts.publicLine).toMatch(/Token tax 0%/);
    expect(AURA_SCANNER_COPY.youCanSell).toMatch(/You can sell/i);
    expect(AURA_SCANNER_COPY.honestLimit).toMatch(/cannot score/i);
  });
});
