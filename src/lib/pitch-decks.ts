/**
 * Public pitch / strategy decks served from /public.
 * Keep filenames stable — they are download URLs.
 */

export type PitchDeck = {
  id: string;
  /** Path under public/, leading slash */
  href: string;
  title: string;
  blurb: string;
  /** Audience / journey tag */
  tag: string;
  lang: "en" | "de" | "both";
};

export const PITCH_DECKS: PitchDeck[] = [
  {
    id: "investor",
    href: "/Aura_OS_Investor_Presentation.pptx",
    title: "Investor presentation",
    blurb:
      "New: operating system for autonomous companies — workforce, subscriptions, token layer, fair launch ops.",
    tag: "Investor",
    lang: "en",
  },
  {
    id: "wien-world",
    href: "/Aura_Gewinner_Presentation_Wien_to_World.pptx",
    title: "Wien → World",
    blurb:
      "The winner story: from Vienna to a global AI company OS — why founding seats matter now.",
    tag: "Vision",
    lang: "both",
  },
  {
    id: "growth-playbook",
    href: "/Aura_Growth_Pitch_Team_Playbook.pptx",
    title: "Growth pitch · team playbook",
    blurb: "How we grow: channels, roles, and the weekly play the team actually runs.",
    tag: "Growth",
    lang: "en",
  },
  {
    id: "product-token",
    href: "/Aura_OS_Produkt_Subscriptions_Token_Strategie.pptx",
    title: "Product · subscriptions · token",
    blurb:
      "What ships next: seats, subscriptions, and how the token stays separate from company compute.",
    tag: "Product",
    lang: "both",
  },
  {
    id: "unit-economics",
    href: "/Aura_Unit_Economics_Detail.pptx",
    title: "Unit economics",
    blurb: "The math behind a founding seat, compute burn, and how the company stays solvent.",
    tag: "Numbers",
    lang: "en",
  },
  {
    id: "lokal-sales",
    href: "/Aura_Lokal_Verkauf.pptx",
    title: "Aura Local · Verkauf (DE)",
    blurb:
      "Für den Tisch: Sterne, Gäste, 49 €/Monat, Einwände, Abschluss. Live auch unter /verkauf.",
    tag: "Verkauf",
    lang: "de",
  },
  {
    id: "lokal-reviews",
    href: "/Aura_Lokal_Google_Review_Boost.pptx",
    title: "Aura Local · Google Review Boost",
    blurb:
      "Local businesses: social, customers, and review requests — the simple phone-first path.",
    tag: "Local",
    lang: "de",
  },
  {
    id: "core-pitch",
    href: "/presentation.pptx",
    title: "Core pitch (EN)",
    blurb: "The short investor-friendly cut of Aura OS — own a company, let AI execute.",
    tag: "Pitch",
    lang: "en",
  },
  {
    id: "lokal-core",
    href: "/presentation-lokal.pptx",
    title: "Aura Local pitch (DE)",
    blurb: "Die lokale Super-App für Betriebe — Social, Kunden, Bewertungen.",
    tag: "Local",
    lang: "de",
  },
];

export const FEATURED_DECK_IDS = [
  "lokal-sales",
  "investor",
  "wien-world",
  "product-token",
  "growth-playbook",
  "unit-economics",
  "lokal-reviews",
] as const;
