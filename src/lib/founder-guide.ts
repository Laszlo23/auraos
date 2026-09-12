/**
 * Public founder handbook — /guide + docs/FOUNDER_GUIDE.md.
 * How to get real work out of the desk. Not token runbooks.
 */

import type { LocaleCopy } from "@/lib/product-story";

export const GUIDE_PATH = "/guide" as const;

export const GUIDE_COPY = {
  kicker: { en: "Founder guide", de: "Gründer-Handbuch" } satisfies LocaleCopy,
  title: {
    en: "How to get work out of Aura OS.",
    de: "So holst du Arbeit aus Aura OS.",
  } satisfies LocaleCopy,
  lead: {
    en: "The desk is not a chatbot. You describe a real company, give one mission, approve what goes public, and proof shows what actually finished. Specific briefs beat vibes.",
    de: "Der Desk ist kein Chatbot. Du beschreibst eine echte Firma, gibst eine Mission, gibst Öffentliches frei, und Proof zeigt, was fertig wurde. Konkrete Briefings schlagen Vibes.",
  } satisfies LocaleCopy,
  hourTitle: { en: "First hour", de: "Erste Stunde" } satisfies LocaleCopy,
  talkTitle: { en: "Talk like a boss, not a prompt", de: "Rede wie ein Chef, nicht wie ein Prompt" } satisfies LocaleCopy,
  talkLead: {
    en: "Atlas reads your company name, city, strategy, and knowledge on every turn. Vague goals produce vague drafts. Fill Settings → Strategy, then say one outcome.",
    de: "Atlas liest bei jeder Runde Firmenname, Stadt, Strategie und Knowledge. Vage Ziele geben vage Entwürfe. Fülle Einstellungen → Strategie, dann ein Ergebnis.",
  } satisfies LocaleCopy,
  deskTitle: { en: "The desk", de: "Der Desk" } satisfies LocaleCopy,
  deskLead: {
    en: "Open what you need. Hide the rest in Settings → menu. Tokens and NFTs do not run this loop.",
    de: "Öffne, was du brauchst. Den Rest in Einstellungen → Menü ausblenden. Token und NFTs betreiben diese Schleife nicht.",
  } satisfies LocaleCopy,
  rulesTitle: { en: "Honest rules", de: "Ehrliche Regeln" } satisfies LocaleCopy,
  moreTitle: { en: "Keep going", de: "Weiter" } satisfies LocaleCopy,
} as const;

export const GUIDE_HOUR: Array<{
  n: string;
  title: LocaleCopy;
  body: LocaleCopy;
  href?: string;
}> = [
  {
    n: "01",
    title: { en: "Wake the company", de: "Firma wecken" },
    body: {
      en: "Sign in. One honest sentence: what you sell, where, who pays. Skip the token pages until the desk has a job.",
      de: "Anmelden. Ein ehrlicher Satz: was du verkaufst, wo, wer zahlt. Token-Seiten erst, wenn der Desk einen Job hat.",
    },
    href: "/access",
  },
  {
    n: "02",
    title: { en: "Write the strategy once", de: "Strategie einmal schreiben" },
    body: {
      en: "Settings → Strategy is injected into every agent. City, offer, voice, what you will not do. Two sentences beat a manifesto.",
      de: "Einstellungen → Strategie steht in jedem Agenten. Stadt, Angebot, Ton, was ihr nicht tut. Zwei Sätze schlagen ein Manifest.",
    },
    href: "/settings",
  },
  {
    n: "03",
    title: { en: "Give one mission this week", de: "Eine Mission diese Woche" },
    body: {
      en: "Plain language, one number, one deadline. “12 bookings from Instagram this month, €0 ads.” Atlas splits the work and waits.",
      de: "Normale Sprache, eine Zahl, eine Frist. „12 Buchungen über Instagram diesen Monat, 0 € Ads.“ Atlas teilt die Arbeit und wartet.",
    },
    href: "/missions",
  },
  {
    n: "04",
    title: { en: "Connect a channel or mailbox", de: "Kanal oder Postfach verbinden" },
    body: {
      en: "Drafts without a channel stay in the app. Outreach without a mailbox never sends. Connect X / Instagram / LinkedIn, or Gmail / Outlook / SMTP.",
      de: "Entwürfe ohne Kanal bleiben in der App. Outreach ohne Postfach geht nie raus. X / Instagram / LinkedIn, oder Gmail / Outlook / SMTP.",
    },
    href: "/connect",
  },
  {
    n: "05",
    title: { en: "Approve the first three", de: "Die ersten drei freigeben" },
    body: {
      en: "Money and public posts wait for your yes. Read the drafts. Edit. Then approve. Leave Autopublish off until three drafts look like you.",
      de: "Geld und öffentliche Posts warten auf dein Ja. Lies die Entwürfe. Ändere. Dann frei. Autopublish aus, bis drei Entwürfe nach dir klingen.",
    },
    href: "/approvals",
  },
  {
    n: "06",
    title: { en: "Share the week", de: "Die Woche teilen" },
    body: {
      en: "After a few days open Week in review → Share this week. Quiet weeks stay zeros. That is the product working, not a bug.",
      de: "Nach ein paar Tagen: Wochenbericht → Diese Woche teilen. Stille Wochen bleiben Nullen. Das ist das Produkt, kein Bug.",
    },
    href: "/report",
  },
];

export const GUIDE_PROMPTS: Array<{ bad: LocaleCopy; good: LocaleCopy }> = [
  {
    bad: { en: "Grow my business.", de: "Wachse mein Business." },
    good: {
      en: "Vienna nail salon. 12 new bookings this month from Instagram + Google. No ads. Voice: warm, no slang, no emojis.",
      de: "Nagelstudio Wien. 12 neue Buchungen diesen Monat über Instagram + Google. Keine Ads. Ton: warm, kein Slang, keine Emojis.",
    },
  },
  {
    bad: { en: "Write some posts.", de: "Schreib ein paar Posts." },
    good: {
      en: "Three X drafts for Tuesday: one before/after, one booking CTA, one founder note. 180 characters. Link in bio only.",
      de: "Drei X-Entwürfe für Dienstag: einmal Vorher/Nachher, ein Buchungs-CTA, eine Gründer-Notiz. 180 Zeichen. Link nur in Bio.",
    },
  },
  {
    bad: { en: "Find me leads.", de: "Finde mir Leads." },
    good: {
      en: "15 Vienna cafés that post weekly but have no newsletter. Draft a 4-line email from my mailbox. Do not send.",
      de: "15 Wiener Cafés, die wöchentlich posten, aber keinen Newsletter haben. Entwurf: 4 Zeilen aus meinem Postfach. Nicht senden.",
    },
  },
];

export const GUIDE_DESK: Array<{
  id: string;
  title: LocaleCopy;
  body: LocaleCopy;
  href: string;
}> = [
  {
    id: "ceo",
    title: { en: "Ask the CEO", de: "CEO fragen" },
    body: {
      en: "Atlas plans, splits work, and waits. Best for strategy and “what next.”",
      de: "Atlas plant, teilt Arbeit und wartet. Am besten für Strategie und „was jetzt“.",
    },
    href: "/ceo",
  },
  {
    id: "missions",
    title: { en: "Missions", de: "Missionen" },
    body: {
      en: "One outcome with a number. The rest of the desk hangs off this.",
      de: "Ein Ergebnis mit einer Zahl. Der Rest des Desks hängt daran.",
    },
    href: "/missions",
  },
  {
    id: "approvals",
    title: { en: "Approvals", de: "Freigaben" },
    body: {
      en: "Spend and publish stay gated unless you flip Autopublish on a channel.",
      de: "Geld und Publish bleiben gesperrt, bis du Autopublish an einem Kanal anmachst.",
    },
    href: "/approvals",
  },
  {
    id: "channels",
    title: { en: "Channels", de: "Kanäle" },
    body: {
      en: "Draft, schedule, drip. Autopublish and free-reply are opt-in per channel.",
      de: "Entwurf, Zeitplan, Drip. Autopublish und Free-Reply sind opt-in pro Kanal.",
    },
    href: "/channels",
  },
  {
    id: "akquise",
    title: { en: "Lead hunter", de: "Lead-Jäger" },
    body: {
      en: "Research and drafts. You send from your Gmail, Outlook, or SMTP. Aura never silent-sends mail.",
      de: "Recherche und Entwürfe. Du sendest aus Gmail, Outlook oder SMTP. Aura mailt nie still.",
    },
    href: "/akquise",
  },
  {
    id: "knowledge",
    title: { en: "Knowledge", de: "Wissen" },
    body: {
      en: "Paste offers, prices, FAQs, voice notes. Tomorrow’s drafts get sharper.",
      de: "Angebote, Preise, FAQs, Ton. Morgen werden die Entwürfe schärfer.",
    },
    href: "/knowledge",
  },
  {
    id: "report",
    title: { en: "Week in review", de: "Wochenbericht" },
    body: {
      en: "Freeze seven days into a public /w/… link. Boss-ready. Quiet weeks stay honest.",
      de: "Sieben Tage als öffentlichen /w/…-Link einfrieren. Chef-tauglich. Stille Wochen bleiben ehrlich.",
    },
    href: "/report",
  },
  {
    id: "local",
    title: { en: "Aura Local", de: "Aura Local" },
    body: {
      en: "Vienna shops, guests, real review invites. Same login. Different ledger from company AURA.",
      de: "Wiener Betriebe, Gäste, echte Review-Einladungen. Gleicher Login. Anderes Ledger als Firmen-AURA.",
    },
    href: "/lokal",
  },
];

export const GUIDE_RULES: LocaleCopy[] = [
  {
    en: "Workforce “Active” means a real queued or running task. Quiet weeks stay zeros.",
    de: "Belegschaft „Aktiv“ heißt eine echte Aufgabe in der Queue oder am Laufen. Stille Wochen bleiben Nullen.",
  },
  {
    en: "The worker ticks about every ten minutes. Tasks move then — not on a fake busy meter.",
    de: "Der Worker tickt etwa alle zehn Minuten. Dann bewegen sich Aufgaben — kein Fake-Busy-Meter.",
  },
  {
    en: "Mailbox outreach is draft-then-you-send. There is no silent email.",
    de: "Mailbox-Outreach ist Entwurf, dann sendest du. Es gibt keine stille Mail.",
  },
  {
    en: "You can run the whole OS without a token or an NFT. Official AURA CA is only on aibusiness.fun and X @bihary41418 — never a DM.",
    de: "Du kannst das ganze OS ohne Token oder NFT nutzen. Offizielle AURA-CA nur auf aibusiness.fun und X @bihary41418 — nie per DM.",
  },
  {
    en: "Nachbar guest points are not company AURA, not the wheel, not founder progress. Do not merge them.",
    de: "Nachbar-Gastpunkte sind nicht Firmen-AURA, nicht das Rad, nicht Founder-Progress. Nicht zusammenführen.",
  },
  {
    en: "Google review links are optional and unpaid. Confirm in-store is the mint gate for guest stamps.",
    de: "Google-Review-Links sind optional und unbezahlt. Bestätigung im Laden ist das Mint-Tor für Gast-Stempel.",
  },
  {
    en: "KYC (Didit) is required for the token sale and live trading. Start it on /identity after consent. We store status only — Didit’s webhook is the approval.",
    de: "KYC (Didit) ist Pflicht für Token-Sale und Live-Trading. Start auf /identity nach Einwilligung. Wir speichern nur den Status — Didits Webhook ist die Freigabe.",
  },
];

export const GUIDE_MORE: Array<{ href: string; label: LocaleCopy; body: LocaleCopy }> = [
  {
    href: "/features",
    label: { en: "Features", de: "Funktionen" },
    body: {
      en: "What the desk does vs optional chain extras.",
      de: "Was der Desk tut vs. optionale Chain-Extras.",
    },
  },
  {
    href: "/how-it-works",
    label: { en: "How it works", de: "So geht’s" },
    body: {
      en: "The company lifecycle, start to proof.",
      de: "Der Firmen-Lebenszyklus, vom Start bis Proof.",
    },
  },
  {
    href: "/faq",
    label: { en: "FAQ", de: "FAQ" },
    body: {
      en: "Channels, TikTok, Farcaster, week-in-review.",
      de: "Kanäle, TikTok, Farcaster, Wochenbericht.",
    },
  },
  {
    href: "/trust",
    label: { en: "Covenant", de: "Bund" },
    body: {
      en: "Verify contracts on official pages only.",
      de: "Contracts nur auf offiziellen Seiten prüfen.",
    },
  },
];
