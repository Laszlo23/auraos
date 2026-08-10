export type LandingTemplateId =
  | "lead_magnet"
  | "service_offer"
  | "ebook_product"
  | "subscription_daily";

export type SiteFaq = { q: string; a: string };

export type SiteContent = {
  brand: string;
  hero: string;
  subhead: string;
  cta: string;
  offer?: string;
  pricing?: string;
  faq?: SiteFaq[];
  accent?: string;
  productName?: string;
};

export const LANDING_TEMPLATES: {
  id: LandingTemplateId;
  name: string;
  blurb: string;
  defaults: Omit<SiteContent, "brand">;
}[] = [
  {
    id: "lead_magnet",
    name: "Lead magnet",
    blurb: "Email capture for a free guide or waitlist.",
    defaults: {
      hero: "Get the free playbook",
      subhead: "Leave your email — we send the guide, nothing else until you ask.",
      cta: "Send me the guide",
      offer: "Free download · no spam",
      faq: [
        { q: "What do I get?", a: "A short PDF playbook delivered to your inbox." },
        { q: "Will you spam me?", a: "No. One send for the guide; optional follow-ups only if you stay subscribed." },
      ],
    },
  },
  {
    id: "service_offer",
    name: "Service offer",
    blurb: "Book a call or buy a service package.",
    defaults: {
      hero: "Work with us",
      subhead: "A focused engagement for founders who want outcomes, not retainers forever.",
      cta: "Book a call",
      offer: "Discovery call · fixed-scope packages available",
      pricing: "From $500",
      faq: [
        { q: "How does it start?", a: "Book a call. We scope. You get a clear proposal." },
        { q: "Do you take equity?", a: "Usually cash. Equity-only deals are rare and explicit." },
      ],
    },
  },
  {
    id: "ebook_product",
    name: "Ebook product",
    blurb: "One-time Stripe Checkout for a digital product.",
    defaults: {
      hero: "The field guide",
      subhead: "A practical ebook you can finish in one sitting.",
      cta: "Buy now",
      offer: "Instant PDF delivery after checkout",
      pricing: "$19 one-time",
      productName: "Field Guide",
      faq: [{ q: "Refunds?", a: "If the file fails to deliver, email us and we make it right." }],
    },
  },
  {
    id: "subscription_daily",
    name: "Daily subscription",
    blurb: "Recurring daily drop — horoscope, tarot, tips, or briefings.",
    defaults: {
      hero: "Your daily drop",
      subhead: "A short note every morning. Cancel anytime.",
      cta: "Subscribe",
      offer: "Daily email · cancel anytime",
      pricing: "$4.99 / month",
      productName: "Daily Drop",
      faq: [
        { q: "When does it arrive?", a: "We generate and send once per day for active subscribers." },
        { q: "Can I cancel?", a: "Yes — manage in the Stripe customer portal or reply to cancel." },
      ],
    },
  },
];

export function isLandingTemplateId(v: unknown): v is LandingTemplateId {
  return (
    v === "lead_magnet" ||
    v === "service_offer" ||
    v === "ebook_product" ||
    v === "subscription_daily"
  );
}

export function templateById(id: LandingTemplateId) {
  const t = LANDING_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}

export function defaultContentFor(brand: string, templateId: LandingTemplateId): SiteContent {
  const t = templateById(templateId);
  return { brand, ...t.defaults };
}

/** Seeded Aura demo subscription businesses. */
export const DEMO_SUBSCRIPTION_SITES = [
  {
    slug: "horoscope-daily",
    template_id: "subscription_daily" as const,
    content: {
      brand: "Horoscope Daily",
      hero: "Your stars, every morning",
      subhead: "A short, grounded horoscope note — not fortune-cookie spam. Cancel anytime.",
      cta: "Subscribe to Horoscope Daily",
      offer: "Daily email · $4.99/mo",
      pricing: "$4.99 / month",
      productName: "Horoscope Daily",
      accent: "sky",
      faq: [
        { q: "Is this AI?", a: "Yes — generated daily for subscribers. Take what resonates; leave the rest." },
        { q: "When is it sent?", a: "Once per day while your subscription is active." },
      ],
    } satisfies SiteContent,
    productName: "Horoscope Daily",
    envPriceKey: "STRIPE_PRICE_HOROSCOPE_DAILY",
  },
  {
    slug: "tarot-daily",
    template_id: "subscription_daily" as const,
    content: {
      brand: "Tarot Daily",
      hero: "One card. One note.",
      subhead: "A daily tarot reflection in your inbox. Soft guidance, no doom.",
      cta: "Subscribe to Tarot Daily",
      offer: "Daily email · $4.99/mo",
      pricing: "$4.99 / month",
      productName: "Tarot Daily",
      accent: "rose",
      faq: [
        { q: "How does it work?", a: "We draw a card theme and write a short reflection each day." },
        { q: "Cancel anytime?", a: "Yes." },
      ],
    } satisfies SiteContent,
    productName: "Tarot Daily",
    envPriceKey: "STRIPE_PRICE_TAROT_DAILY",
  },
] as const;

export function slugifyBrand(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
