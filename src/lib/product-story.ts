/**
 * Conversion narrative for homepage + /how-it-works + /compare + /pricing + /try.
 * Walkthrough numbers are labeled as previews — never claimed as live proof.
 */

import type { UiLocale } from "@/lib/attribution";
import { TOKENOMICS } from "@/lib/tokenomics";

export type LocaleCopy = { en: string; de: string };

export function loc(locale: UiLocale, copy: LocaleCopy): string {
  return locale === "de" ? copy.de : copy.en;
}

export const CATEGORY_LINE: LocaleCopy = {
  en: "Don't hire AI tools. Own an AI company.",
  de: "Kein KI-Tool mieten. Eine KI-Firma besitzen.",
};

export const CATEGORY_FLOW: LocaleCopy = {
  en: "Describe → Build → Mission → Approve → Execute → Proof → Result",
  de: "Beschreiben → Bauen → Mission → Freigeben → Ausführen → Proof → Ergebnis",
};

export const JOURNEY_STEPS: {
  n: string;
  title: LocaleCopy;
  body: LocaleCopy;
  extra?: LocaleCopy;
}[] = [
  {
    n: "01",
    title: { en: "Describe", de: "Beschreiben" },
    body: { en: "“I own a restaurant in Vienna.”", de: "„Ich habe ein Restaurant in Wien.“" },
  },
  {
    n: "02",
    title: { en: "Aura builds", de: "Aura baut" },
    body: {
      en: "CEO + Growth + Sales + Customer Success",
      de: "CEO + Growth + Sales + Customer Success",
    },
  },
  {
    n: "03",
    title: { en: "Give mission", de: "Mission geben" },
    body: { en: "“Get me 20 new customers.”", de: "„Hol mir 20 neue Gäste.“" },
  },
  {
    n: "04",
    title: { en: "Aura plans", de: "Aura plant" },
    body: { en: "7 actions · €14 estimated cost", de: "7 Schritte · ca. 14 € Kosten" },
  },
  {
    n: "05",
    title: { en: "You approve", de: "Du gibst frei" },
    body: {
      en: "Spend and public actions wait for you.",
      de: "Geld und Öffentliches warten auf dich.",
    },
  },
  {
    n: "06",
    title: { en: "AI executes", de: "KI führt aus" },
    body: {
      en: "23 prospects found · 8 contacted · 3 qualified",
      de: "23 Prospects · 8 kontaktiert · 3 qualifiziert",
    },
  },
  {
    n: "07",
    title: { en: "Proof", de: "Proof" },
    body: {
      en: "€14.20 spent · 23 prospects · 3 qualified",
      de: "14,20 € ausgegeben · 23 Prospects · 3 qualifiziert",
    },
  },
  {
    n: "08",
    title: { en: "Result", de: "Ergebnis" },
    body: { en: "+3 customers", de: "+3 Gäste" },
  },
];

export const HOW_IT_WORKS_LONG: { n: string; title: LocaleCopy; body: LocaleCopy }[] = [
  {
    n: "01",
    title: { en: "You define the company", de: "Du definierst die Firma" },
    body: {
      en: "One sentence is enough. Aura names the business, city, and first goal.",
      de: "Ein Satz reicht. Aura erkennt Geschäft, Stadt und erstes Ziel.",
    },
  },
  {
    n: "02",
    title: { en: "Aura builds the workforce", de: "Aura stellt die Belegschaft" },
    body: {
      en: "Atlas (CEO) plus Growth, Social, Customers, Finance — real roles, not a chat tab.",
      de: "Atlas (CEO) plus Growth, Social, Kunden, Finance — echte Rollen, kein Chat-Tab.",
    },
  },
  {
    n: "03",
    title: { en: "You give missions", de: "Du gibst Missionen" },
    body: {
      en: "Plain language. “Get 20 new customers this month.”",
      de: "Normale Sprache. „Hol diesen Monat 20 neue Kunden.“",
    },
  },
  {
    n: "04",
    title: { en: "CEO decomposes them", de: "Der CEO zerlegt sie" },
    body: {
      en: "Atlas splits work, estimates cost, and waits for your yes.",
      de: "Atlas teilt die Arbeit, schätzt Kosten und wartet auf dein Ja.",
    },
  },
  {
    n: "05",
    title: { en: "Employees execute", de: "Mitarbeiter führen aus" },
    body: {
      en: "Research, drafts, outreach, follow-up — after you approve sensitive steps.",
      de: "Recherche, Entwürfe, Outreach, Follow-up — nach deiner Freigabe.",
    },
  },
  {
    n: "06",
    title: { en: "You approve sensitive actions", de: "Du gibst heikle Schritte frei" },
    body: {
      en: "Money and publishing stay gated. Pause anyone instantly.",
      de: "Geld und Veröffentlichung bleiben gesperrt. Jeden sofort pausieren.",
    },
  },
  {
    n: "07",
    title: { en: "Proof is generated", de: "Proof entsteht" },
    body: {
      en: "Timestamp, written result, cost, agent memory — not a chat log.",
      de: "Zeitstempel, Ergebnis, Kosten, Agent-Gedächtnis — kein Chat-Log.",
    },
  },
  {
    n: "08",
    title: { en: "Results feed company memory", de: "Ergebnisse speisen das Firmengedächtnis" },
    body: {
      en: "Tomorrow’s work starts informed. The company does not pretend amnesia.",
      de: "Morgen startet informiert. Die Firma spielt keine Amnesie.",
    },
  },
  {
    n: "09",
    title: { en: "The company gets better", de: "Die Firma wird besser" },
    body: {
      en: "Completed work compounds. You reinvest. The roster learns.",
      de: "Erledigte Arbeit bleibt. Du reinvestierst. Das Team lernt.",
    },
  },
];

export const SEAT_BENEFITS: LocaleCopy[] = [
  { en: "Your own AI company", de: "Deine eigene KI-Firma" },
  { en: "CEO + initial AI workforce", de: "CEO + erste KI-Belegschaft" },
  { en: "Company memory", de: "Firmengedächtnis" },
  { en: "Mission system", de: "Missionssystem" },
  { en: "Approval controls", de: "Freigabe-Kontrolle" },
  { en: "Proof-of-work system", de: "Proof-of-Work" },
  { en: "Founding badge", de: "Founding-Badge" },
  { en: "1 referral invite", de: "1 Weiterempfehlungs-Invite" },
  { en: "Founding cohort access", de: "Zugang zur Founding-Kohorte" },
  { en: "Concierge review queue", de: "Concierge-Review-Warteschlange" },
];

export const SEAT_NOT_INCLUDED: LocaleCopy = {
  en: "Subscriptions and compute are separate. $99 is the one-time unlock — not unlimited AI forever.",
  de: "Abos und Compute sind extra. 99 $ ist der einmalige Unlock — nicht unbegrenzt KI für immer.",
};

export const PRICING_TIERS = TOKENOMICS.subscriptions.map((s) => ({
  ...s,
  workforce:
    s.id === "starter"
      ? { en: "Core", de: "Kern" }
      : s.id === "growth"
        ? { en: "Growth", de: "Wachstum" }
        : { en: "Advanced", de: "Erweitert" },
  automation:
    s.id === "starter"
      ? { en: "Basic", de: "Basis" }
      : s.id === "growth"
        ? { en: "Advanced", de: "Fortgeschritten" }
        : { en: "Full", de: "Voll" },
  bestFor:
    s.id === "starter"
      ? { en: "Small business", de: "Kleiner Betrieb" }
      : s.id === "growth"
        ? { en: "Growing company", de: "Wachsendes Unternehmen" }
        : { en: "Serious operators", de: "Ernsthafte Operatoren" },
}));

export const ECONOMICS_LAYERS: { level: string; title: LocaleCopy; body: LocaleCopy }[] = [
  {
    level: "01",
    title: { en: "AI company", de: "KI-Firma" },
    body: {
      en: "The product. You own it. Employees execute. You approve.",
      de: "Das Produkt. Du besitzt es. Mitarbeiter arbeiten. Du gibst frei.",
    },
  },
  {
    level: "02",
    title: { en: "Business network", de: "Betriebsnetz" },
    body: {
      en: "Wien first — local shops, neighbors, genuine reviews.",
      de: "Wien zuerst — Betriebe, Nachbarn, echte Reviews.",
    },
  },
  {
    level: "03",
    title: { en: "Economic ecosystem", de: "Wirtschaftliches Ökosystem" },
    body: {
      en: "Missions, proof, referrals, marketplace — after the company works.",
      de: "Missionen, Proof, Invites, Marktplatz — nachdem die Firma arbeitet.",
    },
  },
  {
    level: "04",
    title: { en: "AURA token", de: "AURA-Token" },
    body: {
      en: "Optional layer. Not required to run Aura OS. Product first.",
      de: "Optionale Schicht. Nicht nötig, um Aura OS zu betreiben. Produkt zuerst.",
    },
  },
];

export const TRUST_CONTROLS: { title: LocaleCopy; body: LocaleCopy }[] = [
  {
    title: { en: "Spending", de: "Ausgaben" },
    body: {
      en: "AI cannot spend without approval.",
      de: "KI gibt kein Geld aus ohne Freigabe.",
    },
  },
  {
    title: { en: "Publishing", de: "Veröffentlichen" },
    body: {
      en: "AI cannot publish without approval.",
      de: "KI veröffentlicht nichts ohne Freigabe.",
    },
  },
  {
    title: { en: "Access", de: "Zugang" },
    body: {
      en: "Agents only use services you connect.",
      de: "Agenten nutzen nur Dienste, die du verbindest.",
    },
  },
  {
    title: { en: "Pause", de: "Pause" },
    body: {
      en: "Kill or pause any employee instantly.",
      de: "Jeden Mitarbeiter sofort pausieren oder stoppen.",
    },
  },
  {
    title: { en: "Audit", de: "Audit" },
    body: {
      en: "Every meaningful action is recorded.",
      de: "Jeder relevante Schritt wird aufgezeichnet.",
    },
  },
  {
    title: { en: "Memory", de: "Gedächtnis" },
    body: {
      en: "Company memory is inspectable.",
      de: "Das Firmengedächtnis ist einsehbar.",
    },
  },
];

export const INTEGRATIONS: { name: string; status: "live" | "soon" }[] = [
  { name: "X", status: "live" },
  { name: "Instagram", status: "live" },
  { name: "Facebook", status: "live" },
  { name: "LinkedIn", status: "live" },
  { name: "TikTok", status: "live" },
  { name: "Farcaster", status: "live" },
  { name: "Stripe", status: "live" },
  { name: "Google Business", status: "soon" },
  { name: "Gmail", status: "soon" },
  { name: "Shopify", status: "soon" },
  { name: "WordPress", status: "soon" },
  { name: "Telegram", status: "soon" },
  { name: "Discord", status: "soon" },
  { name: "CRM", status: "soon" },
];

export const NOT_FOR: LocaleCopy[] = [
  { en: "You only want a chatbot.", de: "Du willst nur einen Chatbot." },
  { en: "You want AI to replace your judgment.", de: "KI soll dein Urteil ersetzen." },
  { en: "You don’t want to approve spending.", de: "Du willst Ausgaben nicht freigeben." },
  { en: "You don’t want to build something real.", de: "Du willst nichts Echtes aufbauen." },
  { en: "You’re looking for a get-rich-quick token.", de: "Du suchst einen Schnell-reich-Token." },
];

export const IS_FOR: LocaleCopy = {
  en: "You want to own a company and let AI do the work — with you still in control.",
  de: "Du willst eine Firma besitzen und die KI arbeiten lassen — und trotzdem steuern.",
};

export const COMPARE_ROWS: {
  id: string;
  name: LocaleCopy;
  you: LocaleCopy;
  aura: LocaleCopy;
}[] = [
  {
    id: "chatgpt",
    name: { en: "ChatGPT / Claude / Gemini", de: "ChatGPT / Claude / Gemini" },
    you: {
      en: "You ask. It answers. You manage, remember, execute, and coordinate.",
      de: "Du fragst. Es antwortet. Du managst, merkst, führst aus und koordinierst.",
    },
    aura: {
      en: "You give the mission. The company keeps working.",
      de: "Du gibst die Mission. Die Firma arbeitet weiter.",
    },
  },
  {
    id: "agents",
    name: { en: "AI agents", de: "KI-Agenten" },
    you: {
      en: "A helper that still lives in a thread.",
      de: "Ein Helfer, der in einem Thread wohnt.",
    },
    aura: {
      en: "A roster with jobs, memory, budgets, and proof.",
      de: "Eine Belegschaft mit Jobs, Gedächtnis, Budget und Proof.",
    },
  },
  {
    id: "automation",
    name: { en: "Automation tools", de: "Automations-Tools" },
    you: {
      en: "You wire the zaps. The tool waits for a trigger.",
      de: "Du verdrahtest die Zaps. Das Tool wartet auf den Trigger.",
    },
    aura: {
      en: "CEO plans. Employees execute. You approve the sensitive parts.",
      de: "CEO plant. Mitarbeiter führen aus. Du gibst das Heikle frei.",
    },
  },
  {
    id: "va",
    name: { en: "Virtual assistants", de: "Virtuelle Assistenten" },
    you: {
      en: "Hours, handoff, and another inbox.",
      de: "Stunden, Übergabe, noch ein Postfach.",
    },
    aura: {
      en: "Always-on staff that files evidence after each job.",
      de: "Immer-an-Team, das nach jedem Job Belege ablegt.",
    },
  },
  {
    id: "hire",
    name: { en: "Traditional employees", de: "Klassische Mitarbeiter" },
    you: {
      en: "Payroll, management, and a calendar ceiling.",
      de: "Lohn, Führung und die Decke deines Kalenders.",
    },
    aura: {
      en: "You stay the owner. The staff happen to be AI.",
      de: "Du bleibst Owner. Das Team ist halt KI.",
    },
  },
];

export const COMPARE_LADDER: LocaleCopy[] = [
  { en: "Chatbot", de: "Chatbot" },
  { en: "Assistant", de: "Assistent" },
  { en: "Agent", de: "Agent" },
  { en: "AI employee", de: "KI-Mitarbeiter" },
  { en: "AI company", de: "KI-Firma" },
];

export const WALKTHROUGH_NOTE: LocaleCopy = {
  en: "Walkthrough of the product — not a live company and not claimed customer results.",
  de: "Produkt-Walkthrough — keine Live-Firma und keine behaupteten Kundenergebnisse.",
};

export const CASE_STUDY = {
  title: { en: "Mission → Result", de: "Mission → Ergebnis" },
  mission: {
    en: "Get me 10 leads for my Vienna real-estate business.",
    de: "Hol mir 10 Leads für mein Wiener Immobilien-Geschäft.",
  },
  steps: [
    { en: "Research → 143 properties", de: "Recherche → 143 Objekte" },
    { en: "38 prospects", de: "38 Prospects" },
    { en: "14 qualified", de: "14 qualifiziert" },
    { en: "10 outreach drafts", de: "10 Outreach-Entwürfe" },
    { en: "3 meeting asks", de: "3 Meeting-Anfragen" },
  ],
  cost: { en: "€8.42 estimated", de: "ca. 8,42 €" },
  result: { en: "3 qualified meetings (illustrative)", de: "3 qualifizierte Termine (Beispiel)" },
};

export const PREVIEW_ACTIVITY: LocaleCopy[] = [
  { en: "Vela found 14 prospects", de: "Vela hat 14 Prospects gefunden" },
  { en: "Juno qualified 6", de: "Juno hat 6 qualifiziert" },
  { en: "Atlas prepared the campaign", de: "Atlas hat die Kampagne vorbereitet" },
  { en: "€18.20 waiting on your approval", de: "18,20 € warten auf deine Freigabe" },
];
