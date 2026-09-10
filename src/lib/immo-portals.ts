/** Shared catalog of Austrian real-estate portals for every realty desk. */

export type ImmoPortalKind = "marketplace" | "aggregator" | "classifieds" | "newspaper";

export type ImmoPortal = {
  slug: string;
  name: string;
  url: string;
  host: string;
  country: "AT";
  kind: ImmoPortalKind;
  searchHint: string;
  active: boolean;
  /** Higher = searched first. */
  priority: number;
  notes: string;
};

export const AT_IMMO_PORTALS: ImmoPortal[] = [
  {
    slug: "willhaben",
    name: "willhaben Immobilien",
    url: "https://www.willhaben.at/iad/immobilien/",
    host: "willhaben.at",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung Haus mieten von Privat",
    active: true,
    priority: 100,
    notes: "Largest AT classifieds — many private ads.",
  },
  {
    slug: "flatbee",
    name: "flatbee",
    url: "https://flatbee.at/",
    host: "flatbee.at",
    country: "AT",
    kind: "aggregator",
    searchHint: "Wien provisionsfrei Wohnung",
    active: true,
    priority: 95,
    notes: "Commission-free listings an agent can take on.",
  },
  {
    slug: "bazar",
    name: "bazar.at",
    url: "https://www.bazar.at/",
    host: "bazar.at",
    country: "AT",
    kind: "classifieds",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 90,
    notes: "Private classifieds (Krone).",
  },
  {
    slug: "freeimmo",
    name: "freeimmo",
    url: "https://www.freeimmo.at/",
    host: "freeimmo.at",
    country: "AT",
    kind: "classifieds",
    searchHint: "Wien Wohnung mieten provisionsfrei",
    active: true,
    priority: 85,
    notes: "Free listing board.",
  },
  {
    slug: "immobilienscout24",
    name: "ImmoScout24 Österreich",
    url: "https://www.immobilienscout24.at/",
    host: "immobilienscout24.at",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung OR Haus mieten",
    active: true,
    priority: 80,
    notes: "Major AT portal.",
  },
  {
    slug: "immosuchmaschine",
    name: "immosuchmaschine.at",
    url: "https://www.immosuchmaschine.at/",
    host: "immosuchmaschine.at",
    country: "AT",
    kind: "aggregator",
    searchHint: "Wien Mietwohnung",
    active: true,
    priority: 75,
    notes: "Meta-search across AT portals.",
  },
  {
    slug: "findmyhome",
    name: "FindMyHome",
    url: "https://www.findmyhome.at/",
    host: "findmyhome.at",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 70,
    notes: "Broker network + SuchAgentin.",
  },
  {
    slug: "immowelt",
    name: "Immowelt Österreich",
    url: "https://www.immowelt.at/",
    host: "immowelt.at",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 70,
    notes: "AT Immowelt.",
  },
  {
    slug: "immobilien-net",
    name: "immobilien.net",
    url: "https://www.immobilien.net/",
    host: "immobilien.net",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 65,
    notes: "",
  },
  {
    slug: "immodirekt",
    name: "immodirekt",
    url: "https://www.immodirekt.at/",
    host: "immodirekt.at",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 65,
    notes: "",
  },
  {
    slug: "derstandard",
    name: "DER STANDARD Immobilien",
    url: "https://immobilien.derstandard.at/",
    host: "immobilien.derstandard.at",
    country: "AT",
    kind: "newspaper",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 60,
    notes: "",
  },
  {
    slug: "wohnnet",
    name: "wohnnet",
    url: "https://www.wohnnet.at/",
    host: "wohnnet.at",
    country: "AT",
    kind: "newspaper",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 55,
    notes: "Content + listings.",
  },
  {
    slug: "kurier",
    name: "KURIER Immo",
    url: "https://immo.kurier.at/",
    host: "immo.kurier.at",
    country: "AT",
    kind: "newspaper",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 50,
    notes: "Partner dibeo.",
  },
  {
    slug: "oe24",
    name: "oe24 Immoads",
    url: "https://immoads.oe24.at/",
    host: "immoads.oe24.at",
    country: "AT",
    kind: "newspaper",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 50,
    notes: "",
  },
  {
    slug: "immoagent",
    name: "immoagent",
    url: "https://www.immoagent.at/",
    host: "immoagent.at",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 45,
    notes: "",
  },
  {
    slug: "immolive24",
    name: "Immolive24",
    url: "https://www.immolive24.com/",
    host: "immolive24.com",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 45,
    notes: "",
  },
  {
    slug: "alle-gemeinsam",
    name: "Alle Gemeinsam",
    url: "https://www.alle-gemeinsam.at/",
    host: "alle-gemeinsam.at",
    country: "AT",
    kind: "classifieds",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 40,
    notes: "",
  },
  {
    slug: "sodala",
    name: "Sodala Immobilien",
    url: "https://immobilien.sodala.net/",
    host: "immobilien.sodala.net",
    country: "AT",
    kind: "marketplace",
    searchHint: "Wien Wohnung mieten",
    active: true,
    priority: 40,
    notes: "",
  },
  {
    slug: "123inserate",
    name: "123inserate",
    url: "https://www.123inserate.net/",
    host: "123inserate.net",
    country: "AT",
    kind: "classifieds",
    searchHint: "Wien Wohnung mieten",
    active: false,
    priority: 0,
    notes: "Domain appears parked / for sale (2026).",
  },
];

export function activeImmoPortals(): ImmoPortal[] {
  return AT_IMMO_PORTALS.filter((p) => p.active).sort((a, b) => b.priority - a.priority);
}

export function portalSeedUrls(): string[] {
  return activeImmoPortals().map((p) => p.url);
}

export function portalByHost(urlOrHost: string): ImmoPortal | undefined {
  let host = urlOrHost
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  try {
    host = new URL(urlOrHost).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    /* already a host */
  }
  return AT_IMMO_PORTALS.find((p) => p.host === host || host.endsWith(`.${p.host}`));
}
