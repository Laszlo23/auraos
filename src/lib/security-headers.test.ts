import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
  CSP_REPORT_ONLY_HEADER,
  PUBLIC_VITE_KEYS,
  applySecurityHeaders,
  isForbiddenViteKey,
} from "@/lib/security-headers";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("CSP report-only", () => {
  it("does not enforce and keeps scripts/styles working", () => {
    expect(CSP_REPORT_ONLY_HEADER).toBe("Content-Security-Policy-Report-Only");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://www.googletagmanager.com");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://fonts.gstatic.com");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://*.supabase.co");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://*.walletconnect.com");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://maps.google.com");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).not.toContain("/0");
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).not.toContain("unsafe-eval");
  });

  it("sets the header once and leaves an existing value alone", () => {
    const fresh = applySecurityHeaders(new Headers());
    expect(fresh.get(CSP_REPORT_ONLY_HEADER)).toBe(CONTENT_SECURITY_POLICY_REPORT_ONLY);

    const existing = new Headers({ [CSP_REPORT_ONLY_HEADER]: "default-src 'none'" });
    applySecurityHeaders(existing);
    expect(existing.get(CSP_REPORT_ONLY_HEADER)).toBe("default-src 'none'");
  });

  it("matches the production Caddy header", () => {
    const caddy = readFileSync(join(ROOT, "deploy/Caddyfile"), "utf8");
    expect(caddy).toContain(CSP_REPORT_ONLY_HEADER);
    expect(caddy).toContain(CONTENT_SECURITY_POLICY_REPORT_ONLY);
    expect(caddy).toContain("not remote_ip 51.89.194.21");
  });
});

describe("VITE_* stay public", () => {
  it("allowlists only non-secret names", () => {
    for (const key of PUBLIC_VITE_KEYS) {
      expect(isForbiddenViteKey(key), key).toBe(false);
    }
    expect(isForbiddenViteKey("VITE_WORKER_SECRET")).toBe(true);
    expect(isForbiddenViteKey("VITE_NOWPAYMENTS_IPN_SECRET")).toBe(true);
    expect(isForbiddenViteKey("VITE_RELIC_MINTER_KEY")).toBe(true);
    expect(isForbiddenViteKey("VITE_RELIC_ANSWER_HASH")).toBe(true);
    expect(isForbiddenViteKey("VITE_SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
    expect(isForbiddenViteKey("VITE_PRIVATE_SALE_DEPLOYER_KEY")).toBe(true);
    expect(isForbiddenViteKey("VITE_PRIVATE_SALE_CONTRACT")).toBe(false);
  });

  it("keeps .env.example VITE_* on the public allowlist", () => {
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    const keys = [...example.matchAll(/^VITE_[A-Z0-9_]+/gm)].map((m) => m[0]);
    expect(keys.length).toBeGreaterThan(5);
    for (const key of keys) {
      expect(PUBLIC_VITE_KEYS, key).toContain(key);
      expect(isForbiddenViteKey(key), key).toBe(false);
    }
  });
});
