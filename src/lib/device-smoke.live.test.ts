import { describe, expect, it } from "vitest";

import { SITE_URL } from "@/lib/site";
import {
  COUNTRY_ACCEPT_LANGUAGE,
  fetchPublicSmoke,
  PHONE_USER_AGENTS,
  PUBLIC_SMOKE_PATHS,
} from "@/lib/device-smoke";

const live = process.env.AURA_LIVE_SMOKE === "1";

describe.skipIf(!live)("live device smoke — aibusiness.fun", () => {
  it("serves the home page on Android, iPhone, iPad, and desktop", async () => {
    const android = PHONE_USER_AGENTS.find((d) => d.id === "android-chrome-pixel")!;
    const results = await Promise.all(
      PHONE_USER_AGENTS.map((device) =>
        fetchPublicSmoke("/", {
          userAgent: device.ua,
          acceptLanguage: "en-US,en;q=0.9",
        }),
      ),
    );
    for (const row of results) {
      expect(row.status, `${row.url} ${row.status}`).toBeGreaterThanOrEqual(200);
      expect(row.status).toBeLessThan(400);
      expect(row.issues, `${row.url} ${row.issues.join("; ")}`).toEqual([]);
    }
    expect(android.ua).toMatch(/Android/i);
  });

  it("does not geo-block home for sampled countries", async () => {
    const ua = PHONE_USER_AGENTS.find((d) => d.id === "android-chrome-pixel")!.ua;
    const results = await Promise.all(
      COUNTRY_ACCEPT_LANGUAGE.map((locale) =>
        fetchPublicSmoke("/", {
          userAgent: ua,
          acceptLanguage: locale.header,
        }),
      ),
    );
    for (const row of results) {
      expect(row.status, row.url).toBeLessThan(400);
      expect(row.issues, `${row.url} ${row.issues.join("; ")}`).toEqual([]);
    }
  });

  it("keeps public marketing pages HTML-200", async () => {
    const ua = PHONE_USER_AGENTS.find((d) => d.id === "iphone-safari")!.ua;
    const results = await Promise.all(
      PUBLIC_SMOKE_PATHS.map((path) =>
        fetchPublicSmoke(path, {
          userAgent: ua,
          acceptLanguage: "de-AT,de;q=0.9,en;q=0.8",
        }),
      ),
    );
    for (const row of results) {
      expect(row.status, `${row.url} HTTP ${row.status}`).toBeLessThan(400);
      expect(row.issues, `${row.url}: ${row.issues.join("; ")}`).toEqual([]);
    }
  });

  it("keeps /api/ceo closed without a session", async () => {
    const res = await fetch(`${SITE_URL}/api/ceo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.status).toBeGreaterThanOrEqual(401);
    expect(res.status).toBeLessThan(500);
  });
});
