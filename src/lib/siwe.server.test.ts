import { describe, expect, it } from "vitest";

import {
  SIWE_CHAIN_ID,
  SIWE_STATEMENT,
  SIWE_TTL_MS,
  buildSiweMessage,
  checksumAddress,
  nonceExpired,
  normalizeAddress,
  resolveSiweHost,
  siweEmailFor,
} from "./siwe.server";
import { displayUserLabel, isSiweEmail, truncateAddress } from "./siwe-display";

const ADDR = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
const NORM = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";

describe("SIWE address", () => {
  it("normalizes checksum to lowercase", () => {
    expect(normalizeAddress(ADDR)).toBe(NORM);
    expect(normalizeAddress("not-an-address")).toBeNull();
    expect(checksumAddress(NORM)).toBe(ADDR);
  });

  it("builds a synthetic email from the lowercase address", () => {
    expect(siweEmailFor(ADDR)).toBe(`${NORM}@siwe.aibusiness.fun`);
    expect(isSiweEmail(siweEmailFor(ADDR))).toBe(true);
    expect(isSiweEmail("founders@aibusiness.fun")).toBe(false);
  });

  it("never shows the synthetic email in the UI label", () => {
    expect(displayUserLabel(siweEmailFor(ADDR))).toBe(truncateAddress(NORM));
    expect(displayUserLabel("ada@company.com")).toBe("ada@company.com");
    expect(displayUserLabel(null, ADDR)).toBe(truncateAddress(ADDR));
  });
});

describe("SIWE message", () => {
  it("is EIP-4361 shaped and stable", () => {
    const issuedAt = "2026-08-31T00:00:00.000Z";
    const expirationTime = "2026-08-31T00:02:00.000Z";
    const message = buildSiweMessage({
      address: ADDR,
      nonce: "abc123",
      domain: "aibusiness.fun",
      uri: "https://aibusiness.fun/auth",
      chainId: SIWE_CHAIN_ID,
      issuedAt,
      expirationTime,
    });
    expect(message).toContain("aibusiness.fun wants you to sign in with your Ethereum account:");
    expect(message).toContain(ADDR);
    expect(message).toContain(SIWE_STATEMENT);
    expect(message).toContain("URI: https://aibusiness.fun/auth");
    expect(message).toContain(`Chain ID: ${SIWE_CHAIN_ID}`);
    expect(message).toContain("Nonce: abc123");
    expect(message).toContain(`Issued At: ${issuedAt}`);
    expect(message).toContain(`Expiration Time: ${expirationTime}`);
  });

  it("expires after the TTL window", () => {
    const now = Date.parse("2026-08-31T00:02:00.000Z");
    expect(nonceExpired("2026-08-31T00:02:00.000Z", now)).toBe(true);
    expect(nonceExpired("2026-08-31T00:01:59.000Z", now)).toBe(true);
    expect(nonceExpired("2026-08-31T00:02:01.000Z", now)).toBe(false);
    expect(SIWE_TTL_MS).toBe(120_000);
  });
});

describe("SIWE host", () => {
  it("keeps localhost local and pins production to SITE_URL", () => {
    expect(resolveSiweHost("http://localhost:3000").host).toBe("localhost:3000");
    expect(resolveSiweHost("https://aibusiness.fun").origin).toBe("https://aibusiness.fun");
    expect(resolveSiweHost("https://evil.example").origin).toBe("https://aibusiness.fun");
    expect(resolveSiweHost(null).origin).toBe("https://aibusiness.fun");
  });
});
