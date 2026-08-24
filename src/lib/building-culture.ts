/** Shipped Building Culture products — public links only, no invented CAs. */

export type BuildingCultureProduct = {
  id: string;
  href: string;
  title: string;
  titleDe: string;
  blurb: string;
  blurbDe: string;
};

export const BUILDING_CULTURE_PRODUCTS: BuildingCultureProduct[] = [
  {
    id: "aura-os",
    href: "https://aibusiness.fun/",
    title: "Aura OS",
    titleDe: "Aura OS",
    blurb: "Subscription software. AI companies, Wien shops, real invoices.",
    blurbDe: "Abo-Software. KI-Firmen, Wiener Betriebe, echte Rechnungen.",
  },
  {
    id: "culture-id",
    href: "https://app.buildingcultureid.space/",
    title: "Culture ID",
    titleDe: "Culture ID",
    blurb: "Names, credentials, reputation on Base.",
    blurbDe: "Namen, Nachweise, Reputation auf Base.",
  },
  {
    id: "pepe",
    href: "https://pepe.buildingcultureid.space/",
    title: "STACK XI · Pepe",
    titleDe: "STACK XI · Pepe",
    blurb: "Matchday predictions and culture on Base.",
    blurbDe: "Matchday-Tipps und Kultur auf Base.",
  },
  {
    id: "wmos",
    href: "https://wmos.buildingcultureid.space/",
    title: "World Cup OS",
    titleDe: "World Cup OS",
    blurb: "Predict. Prove. Settle. Shipped demo — TxLINE, not a slide.",
    blurbDe: "Tippen. Beweisen. Abrechnen. Gebaute Demo — TxLINE, keine Folie.",
  },
];
