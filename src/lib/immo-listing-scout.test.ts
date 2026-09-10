import { describe, expect, it } from "vitest";

import { AT_IMMO_PORTALS, portalByHost, portalSeedUrls } from "./immo-portals";
import {
  DEFAULT_IMMO_WATCH,
  extractAreaM2,
  extractPrice,
  extractRooms,
  listingFromSearchHit,
  looksLikeListingUrl,
  portalSearchQueries,
  scoreListing,
} from "./immo-listing-scout";

describe("AT immo portal catalog", () => {
  it("has unique slugs and hosts", () => {
    const slugs = AT_IMMO_PORTALS.map((p) => p.slug);
    const hosts = AT_IMMO_PORTALS.map((p) => p.host);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(hosts).size).toBe(hosts.length);
    expect(AT_IMMO_PORTALS.length).toBe(19);
    expect(AT_IMMO_PORTALS.filter((p) => p.active).length).toBe(18);
  });

  it("resolves hosts and seed urls", () => {
    expect(portalByHost("https://www.willhaben.at/iad/immobilien/d/x")?.slug).toBe("willhaben");
    expect(portalSeedUrls()[0]).toContain("willhaben.at");
    expect(portalSeedUrls()).not.toContain("https://www.123inserate.net/");
  });
});

describe("listing URL filter", () => {
  it("accepts concrete ads and rejects hubs", () => {
    expect(
      looksLikeListingUrl(
        "https://www.willhaben.at/iad/immobilien/d/mietwohnungen/wien/wien-1100-favoriten/x-773265297/",
      ),
    ).toBe(true);
    expect(looksLikeListingUrl("https://www.immobilienscout24.at/expose/686ce438eab1d11297b3d6e1")).toBe(
      true,
    );
    expect(
      looksLikeListingUrl("https://www.flatbee.at/properties/property_detail/82b3e494-Fernkorngasse"),
    ).toBe(true);
    expect(looksLikeListingUrl("https://www.immobilienscout24.at/regional/wien/wien/wohnung-mieten")).toBe(
      false,
    );
    expect(looksLikeListingUrl("https://www.willhaben.at/iad/immobilien/")).toBe(false);
  });
});

describe("listing scoring", () => {
  it("boosts Wien + provisionsfrei rentals", () => {
    const hit = scoreListing({
      title: "2-Zimmer Wohnung 1100 Wien provisionsfrei ab sofort",
      snippet: "64 m² Gesamtmiete € 849 von Privat",
      url: "https://www.flatbee.at/properties/property_detail/82b3e494-Fernkorngasse-54-58-Wien-1100",
      criteria: DEFAULT_IMMO_WATCH,
    });
    expect(hit.privateSeller).toBe(true);
    expect(hit.deal).toBe("mieten");
    expect(hit.score).toBeGreaterThanOrEqual(80);
  });

  it("penalizes off-region cities", () => {
    const hit = scoreListing({
      title: "Mehrfamilienhaus Köln-Mülheim kaufen",
      snippet: "8 Wohnungen in Köln",
      url: "https://www.immomaxx.de/immobilien/haus-mehrfamilienhaus-in-koeln-muelheim-kaufen-3709/",
      criteria: DEFAULT_IMMO_WATCH,
    });
    expect(hit.score).toBeLessThan(50);
  });

  it("parses price rooms area", () => {
    expect(extractPrice("Gesamtbelastung € 1.249,-")).toBe("€ 1.249");
    expect(extractRooms("3-Zimmer-Dachgeschosswohnung")).toBe(3);
    expect(extractAreaM2("65,03 m²")).toBe(65);
  });

  it("drops hub pages from drafts", () => {
    expect(
      listingFromSearchHit({
        url: "https://www.immobilienscout24.at/regional/wien/wien/wohnung-mieten",
        title: "Wohnung mieten in Wien",
        snippet: "3534 Mietwohnungen",
        criteria: DEFAULT_IMMO_WATCH,
      }),
    ).toBeNull();
  });
});

describe("portal search queries", () => {
  it("scopes to site host and region", () => {
    const portal = AT_IMMO_PORTALS.find((p) => p.slug === "willhaben")!;
    const qs = portalSearchQueries(portal, DEFAULT_IMMO_WATCH);
    expect(qs.some((q) => q.includes("site:willhaben.at"))).toBe(true);
    expect(qs.some((q) => q.includes("Wien"))).toBe(true);
  });
});
