import {
  AURA_ALLOCATIONS,
  AURA_MAX_SUPPLY_DISPLAY,
  AURA_MAX_SUPPLY_DISPLAY_DE,
  AURA_TEAM_VESTING,
  formatAuraAmount,
} from "@/lib/aura-token";

export type WpBlock =
  | { kind: "p"; text: string }
  | { kind: "lead"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "notice"; text: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type WpSection = {
  id: string;
  title: string;
  blocks: WpBlock[];
};

export const WHITEPAPER_META = {
  title: "AURA Token — the economic layer of Building Culture",
  subtitle: "AURA OS · AURA Lokal · Building Culture ecosystem",
  version: "Whitepaper 1.0",
  date: "15 August 2026",
} as const;

export const WHITEPAPER_META_DE = {
  title: "AURA Token — womit Building Culture wirtschaftet",
  subtitle: "AURA OS · AURA Lokal · das Netz rund um Building Culture",
  version: "Whitepaper 1.0",
  date: "15. August 2026",
} as const;

const ALLOC_ROWS = AURA_ALLOCATIONS.map((a) => [
  a.label,
  `${a.pct}%`,
  formatAuraAmount(a.amount),
]);

const ALLOC_ROWS_DE = AURA_ALLOCATIONS.map((a) => [
  a.labelDe,
  `${a.pct} %`,
  formatAuraAmount(a.amount, "de"),
]);

export const AURA_WHITEPAPER: WpSection[] = [
  {
    id: "notice",
    title: "Important notice",
    blocks: [
      {
        kind: "notice",
        text: "This is a strategic and technical whitepaper draft — not legal, financial, tax, or investment advice. AURA is intended as a utility and ecosystem token. Nothing here promises future token value, guaranteed returns, guaranteed liquidity, or investment performance. Before any public token offering, the project must obtain professional advice on MiCA and applicable Austrian and European law. Classification cannot be determined by branding alone.",
      },
    ],
  },
  {
    id: "summary",
    title: "1. Executive summary",
    blocks: [
      {
        kind: "p",
        text: "AURA is the economic coordination layer connecting products, users, businesses, and AI agents in the Building Culture ecosystem.",
      },
      {
        kind: "ul",
        items: [
          "AURA OS — AI-native operating environment for people, businesses, and autonomous agents.",
          "AURA Lokal — local-business growth and participation, starting in Vienna.",
        ],
      },
      {
        kind: "lead",
        text: "First objective: 1,000 local businesses. Second: the contributor network around them. Third: convert that network into an AURA-powered economy.",
      },
      {
        kind: "p",
        text: "AURA is not designed merely as another cryptocurrency. It is the transaction, incentive, reputation, and participation layer of Building Culture.",
      },
    ],
  },
  {
    id: "problem",
    title: "2. The problem",
    blocks: [
      {
        kind: "p",
        text: "A local business may already have a website, Google profile, social accounts, ads, CRM, reviews, payments, and AI tools — yet they do not operate as one local economic network. People participate online without a simple way to monetize attention, knowledge, and local contribution. The missing layer is a shared economic system. AURA is designed to provide it.",
      },
    ],
  },
  {
    id: "vision",
    title: "3. Building Culture vision",
    blocks: [
      {
        kind: "p",
        text: "Building Culture is the ecosystem. AURA is the economic layer. Products can include AURA OS, AURA Lokal, AI agents, local-business tools, creator products, marketplaces, and future applications.",
      },
      {
        kind: "lead",
        text: "Build products that create real economic activity, then let that activity reinforce the AURA economy — utility first, token as coordination, not the other way around.",
      },
    ],
  },
  {
    id: "os",
    title: "4. AURA OS",
    blocks: [
      {
        kind: "p",
        text: "AURA OS moves software from User → App → Action toward User → Intent → AI Agent → Action → Result. Agents can research, market, support, sell, administer, create, generate leads, analyze, automate, and execute workflows. AURA is how those agents participate economically.",
      },
    ],
  },
  {
    id: "lokal",
    title: "5. AURA Lokal",
    blocks: [
      {
        kind: "p",
        text: "AURA Lokal is the physical-world growth engine. Vienna first. It connects businesses, customers, contributors, AI, data, and rewards — visibility, acquisition, authentic feedback, content, retention, referrals, and operations.",
      },
      {
        kind: "notice",
        text: "AURA Lokal does not sell fake or incentivized Google reviews. Google requires genuine experiences and prohibits payment or incentives in exchange for reviews. Users may be rewarded for verified discovery, surveys, authentic feedback, product testing, content, referrals, compliant campaigns, and marketplace tasks. Google reviews stay independent.",
      },
    ],
  },
  {
    id: "vienna",
    title: "6. Vienna 1,000-business strategy",
    blocks: [
      {
        kind: "lead",
        text: "Launch city: Vienna. Target: 1,000 businesses — restaurants, cafés, hairdressers, beauty, fitness, trades, realty, clinics, hotels, automotive, retail, professional services, entertainment.",
      },
      {
        kind: "p",
        text: "Density in one city beats thin coverage of 100,000 businesses online. The city is the laboratory.",
      },
    ],
  },
  {
    id: "flywheel",
    title: "7–8. Flywheel and street acquisition",
    blocks: [
      {
        kind: "p",
        text: "Business joins → growth tools → customers and contributors interact → users earn AURA for legitimate participation → users invite others → businesses get more activity → more businesses join → more economic activity enters AURA → utility increases.",
      },
      {
        kind: "p",
        text: "Street-level onboarding in Vienna: create an account, verify as required, complete a first legitimate paid task or onboarding reward, then refer. The initial cash incentive is an acquisition expense — not payment for a Google review.",
      },
    ],
  },
  {
    id: "cash-to-aura",
    title: "9–12. From cash to AURA",
    blocks: [
      {
        kind: "ul",
        items: [
          "Phase 1 — fiat onboarding.",
          "Phase 2 — fiat + AURA.",
          "Phase 3 — AURA-first rewards.",
          "Contributors: discovery, surveys, testing, authentic feedback, content, referrals, campaigns, marketplace tasks.",
          "Referrals pay only after the invited person creates verified value — not endless recruitment.",
          "Businesses pay for subscriptions, AI, campaigns, analytics, visibility, marketplace services — in fiat, stablecoins, or AURA as architecture allows.",
        ],
      },
    ],
  },
  {
    id: "utility",
    title: "13. Token utility",
    blocks: [
      {
        kind: "ul",
        items: [
          "Ecosystem payments for eligible products and services",
          "Contributor and referral rewards tied to verified activity",
          "AI-agent and marketplace transactions",
          "Premium access and merchant benefits",
          "Selected governance where legally and technically appropriate",
          "Optional staking / locking for tiers — never a promise of yield",
        ],
      },
    ],
  },
  {
    id: "spec",
    title: "14–20. Token specification",
    blocks: [
      {
        kind: "lead",
        text: `Maximum supply: ${AURA_MAX_SUPPLY_DISPLAY} AURA. Fixed cap unless a future governance process explicitly authorizes otherwise.`,
      },
      {
        kind: "table",
        headers: ["Allocation", "Share", "AURA"],
        rows: [...ALLOC_ROWS, ["Total", "100%", AURA_MAX_SUPPLY_DISPLAY]],
      },
      {
        kind: "p",
        text: `Team (${formatAuraAmount(93_333_333)} AURA): ${AURA_TEAM_VESTING.note} Private / strategic tokens carry defined lockups. Liquidity management should be transparent; locks, when used, publicly verifiable. No promise of price stability. Treasury wallets should be identifiable whenever legally possible.`,
      },
      {
        kind: "notice",
        text: "These percentages are a proposed tokenomics framework, not a finalized legal allocation or an offer to sell.",
      },
    ],
  },
  {
    id: "emission",
    title: "21–24. Emission, rewards, fraud, reputation",
    blocks: [
      {
        kind: "p",
        text: "Fixed maximum supply plus controlled distribution — not unlimited printing. Rewards follow proof of contribution, not recruitment-alone or holding-alone. Anti-fraud: verification, device signals, duplicate detection, cooldowns, reward limits, manual review, AI-assisted pattern detection. Reputation is an internal score (activity quality, disputes, fraud signals) — not the same as token ownership.",
      },
    ],
  },
  {
    id: "agents",
    title: "25–28. Agent economy, cards, revenue",
    blocks: [
      {
        kind: "p",
        text: "Long-term, agents may earn and spend AURA for leads, campaigns, support, research, and workflows — machine-to-machine economics. Any card or spend product must come from regulated partners. AURA is not a bank, payment institution, or card issuer unless separately authorized.",
      },
      {
        kind: "p",
        text: "AURA Lokal revenue: SaaS, premium AI, campaigns, marketplace fees, qualified leads, visibility, financial referrals, enterprise. Illustrative Lokal prices: Starter €29 / Growth €79 / Pro €149 / Enterprise custom — to be validated in market. Aura OS subscriptions remain a separate product P&L.",
      },
    ],
  },
  {
    id: "stages",
    title: "29–36. 1,000 businesses, expansion, unit economics",
    blocks: [
      {
        kind: "ul",
        items: [
          "Stage 1 (0–100): founder-led sales, visits, free trials — prove fit.",
          "Stage 2 (100–300): scripts, ambassadors, vertical pages, automated onboarding.",
          "Stage 3 (300–600): district density, clusters, events.",
          "Stage 4 (600–1,000): referral loops, contributor network, AI sales, case studies.",
          "Then Austria → DACH → Europe → global. Vienna is the first AURA economy, not a software dump.",
          "Illustrative 1,000 × €79 = €79k MRR — a scenario, not a forecast.",
          "€20 street experiment × 1,000 contributors = €20k acquisition budget, measured on conversion, verification, 7/30-day retention, referrals, and LTV. Not compensation for Google reviews.",
        ],
      },
    ],
  },
  {
    id: "community",
    title: "37–43. Community, data, governance, compliance",
    blocks: [
      {
        kind: "p",
        text: "Vienna community (e.g. WhatsApp) can accelerate formation — without unnecessary collection of personal phone numbers. GDPR: minimum necessary data, access control, deletion rights. Governance starts founder-led, then transparent treasury, then selected community votes — never decentralization as marketing. Treasury: multisig, limits, public reporting where possible.",
      },
      {
        kind: "notice",
        text: "AURA will not sell Google reviews, pay for Google reviews, require positive ratings or specific text, coordinate artificial campaigns, or suppress negatives. Reviews must reflect genuine experiences. That is a product principle, not a footnote.",
      },
    ],
  },
  {
    id: "moat",
    title: "44–48. Why this is bigger than reviews",
    blocks: [
      {
        kind: "p",
        text: "The stack is discovery → acquisition → experience → feedback → content → retention → referral → revenue. The moat is businesses + contributors + data + AI + distribution + density — not the ticker. AURA Lokal is the physical-world engine. AURA OS is AI-native execution. AURA coordinates the economy.",
      },
    ],
  },
  {
    id: "roadmap",
    title: "49–52. Roadmap and KPIs",
    blocks: [
      {
        kind: "ul",
        items: [
          "Phase 0 — architecture, legal analysis, Lokal MVP, OS, onboarding.",
          "Phase 1 — Vienna: first 100 businesses, first contributor cohort, street experiment.",
          "Phase 2 — path to 1,000 businesses and recurring revenue.",
          "Phase 3 — AURA utility, rewards, business payments, liquidity.",
          "Phase 4–7 — Austria, DACH, Europe, global.",
          "Track paying businesses, MRR, CAC, churn, verified contributors, tasks, fraud rate, AURA velocity. Target is 1,000 active paying businesses, not empty registrations.",
        ],
      },
    ],
  },
  {
    id: "why-token",
    title: "53–56. Why the token exists",
    blocks: [
      {
        kind: "p",
        text: "Without a common layer, businesses use euros, creators use platforms, agents use APIs, users use points, referrals use proprietary credits. AURA can share one coordination layer. Demand should come from utility — services, rewards, agent payments, access — never from a promise of appreciation.",
      },
      {
        kind: "lead",
        text: "Utility does not guarantee market value. AURA can lose value, become illiquid, or fail. MiCA requires those warnings.",
      },
      {
        kind: "p",
        text: "AURA must not depend on Google, WhatsApp, X, Meta, one chain, or one AI vendor. If one platform changes, the ecosystem continues.",
      },
    ],
  },
  {
    id: "risks",
    title: "55. Principal risks",
    blocks: [
      {
        kind: "ul",
        items: [
          "Market, regulatory, technology, and security risk",
          "Adoption, competition, liquidity, and execution risk",
          "Fraud in contributor economies",
          "Third-party platform policy changes",
        ],
      },
    ],
  },
  {
    id: "close",
    title: "57–60. Thesis and close",
    blocks: [
      {
        kind: "p",
        text: "Start with 1,000 businesses in Vienna, then 10,000, then 100,000. Humans create value. Businesses create demand. AI creates execution. AURA coordinates the economy. The investment thesis is not “buy because the token will go up.” It is: build a real economy around live products, starting with a dense Vienna network.",
      },
      {
        kind: "lead",
        text: "Every useful action should be able to create economic value. AURA OS. AURA Lokal. Building Culture. One ecosystem. One economy.",
      },
      {
        kind: "notice",
        text: "This document is not the final regulatory crypto-asset whitepaper. Before any public offer, admission to trading, or marketing campaign involving AURA, obtain specialist Austrian/EU legal advice and prepare applicable MiCA disclosures. AURA is not a promise of profit. Success depends on execution, adoption, compliance, technology, and real economic activity.",
      },
    ],
  },
];

export const AURA_WHITEPAPER_DE: WpSection[] = [
  {
    id: "notice",
    title: "Wichtiger Hinweis",
    blocks: [
      {
        kind: "notice",
        text: "Das ist ein Entwurf — Strategie und Technik, keine Rechts-, Steuer- oder Anlageberatung. AURA soll im Alltag etwas nützen, nicht als Wette verkauft werden. Nichts hier verspricht, dass der Token teurer wird, dass man ihn immer verkaufen kann, oder dass sich eine Einlage verzinst. Bevor AURA öffentlich angeboten wird, holen wir Rat zu MiCA und zum österreichischen und europäischen Recht. Wie etwas heißt, entscheidet nicht, was es rechtlich ist.",
      },
    ],
  },
  {
    id: "summary",
    title: "1. Kurz gesagt",
    blocks: [
      {
        kind: "p",
        text: "AURA ist das gemeinsame Geld- und Belohnungssystem von Building Culture. Darüber können Produkte, Gäste, Betriebe und KI-Mitarbeiter zahlen und verdienen.",
      },
      {
        kind: "ul",
        items: [
          "AURA OS — die Software, mit der ein Mensch eine Firma führt und KI die Arbeit macht.",
          "AURA Lokal — Wachstum für Betriebe vor Ort. Wir fangen in Wien an.",
        ],
      },
      {
        kind: "lead",
        text: "Zuerst 1.000 Betriebe. Dann die Leute rundherum, die mitmachen. Dann wird aus dem Netz eine Wirtschaft, die mit AURA läuft.",
      },
      {
        kind: "p",
        text: "AURA ist nicht einfach ein weiterer Coin. Es ist, womit man im Netz bezahlt, belohnt wird, Vertrauen aufbaut und mitmacht.",
      },
    ],
  },
  {
    id: "problem",
    title: "2. Das Problem",
    blocks: [
      {
        kind: "p",
        text: "Viele Betriebe haben schon eine Website, ein Google-Profil, Social Media, Werbung, ein Kundenbuch, Bewertungen, Kassa und irgendwelche KI-Hilfen. Trotzdem hängt das nicht zusammen. Es ist kein gemeinsames Netz in der Stadt. Und wer online Zeit und Wissen hergibt, kann daraus kaum etwas Echtes machen. Genau diese gemeinsame Schicht fehlt. AURA soll sie sein.",
      },
    ],
  },
  {
    id: "vision",
    title: "3. Was Building Culture will",
    blocks: [
      {
        kind: "p",
        text: "Building Culture ist das Ganze. AURA ist, womit darin gewirtschaftet wird. Dazu gehören AURA OS, AURA Lokal, KI-Mitarbeiter, Werkzeuge für Betriebe, Angebote für Macher, ein Marktplatz — und was später dazukommt.",
      },
      {
        kind: "lead",
        text: "Zuerst Produkte, an denen echte Leute echtes Geld verdienen. Der Token kommt danach und hält das zusammen — nicht umgekehrt.",
      },
    ],
  },
  {
    id: "os",
    title: "4. AURA OS",
    blocks: [
      {
        kind: "p",
        text: "Früher: Mensch öffnet eine App und klickt sich durch. Bei AURA OS sagt man, was man will. Ein KI-Mitarbeiter macht den Weg. Am Ende steht ein Ergebnis. Die KI kann recherchieren, werben, helfen, verkaufen, den Laden führen, Texte und Bilder machen, Interessenten finden, Zahlen lesen und Abläufe erledigen. AURA ist, womit diese Mitarbeiter im Netz bezahlen und bezahlt werden.",
      },
    ],
  },
  {
    id: "lokal",
    title: "5. AURA Lokal",
    blocks: [
      {
        kind: "p",
        text: "AURA Lokal holt das Ganze auf die Straße. Wien zuerst. Betriebe, Gäste, Leute die mitmachen, KI, Daten und Belohnungen gehören zusammen: gefunden werden, neue Gäste, ehrliches Feedback, Beiträge, dass Leute wiederkommen, Empfehlungen, der Alltag im Laden.",
      },
      {
        kind: "notice",
        text: "AURA Lokal verkauft keine Google-Sterne und zahlt nicht dafür. Google will echte Besuche und verbietet Geld oder Geschenke im Tausch gegen eine Bewertung. Belohnen darf man, was geprüft ist: einen Betrieb finden, eine Umfrage, ehrliches Feedback, etwas ausprobieren, einen Beitrag, eine Empfehlung, erlaubte Aktionen und Aufgaben am Marktplatz. Die Google-Bewertung bleibt getrennt und frei.",
      },
    ],
  },
  {
    id: "vienna",
    title: "6. Wien: 1.000 Betriebe",
    blocks: [
      {
        kind: "lead",
        text: "Startstadt: Wien. Ziel: 1.000 Betriebe — Lokale, Cafés, Friseure, Beauty, Fitness, Handwerk, Immobilien, Ordinationen, Hotels, Autohäuser, Handel, Büros, Kultur.",
      },
      {
        kind: "p",
        text: "Lieber eine Stadt voll als ganz Österreich dünn. Die Stadt ist die Probe. Wenn’s zwischen Ottakring und dem 7. hält, darf’s weiter.",
      },
    ],
  },
  {
    id: "flywheel",
    title: "7–8. Der Kreislauf und die Straße",
    blocks: [
      {
        kind: "p",
        text: "Ein Betrieb kommt dazu. Er bekommt Werkzeuge. Gäste und Mitmacher tun etwas. Wer ehrlich mitmacht, verdient AURA. Die Leute holen Freunde. Der Betrieb hat mehr Leben. Der nächste Betrieb sieht das und kommt auch. Je mehr echte Wirtschaft durch AURA geht, desto mehr nützt der Token.",
      },
      {
        kind: "p",
        text: "Auf der Straße in Wien: Konto anlegen, ausweisen soweit nötig, eine erste echte Aufgabe machen oder eine Willkommensbelohnung holen, dann jemanden mitnehmen. Das erste Bargeld ist Werbung, damit Leute anfangen — nicht der Preis für eine Google-Bewertung.",
      },
    ],
  },
  {
    id: "cash-to-aura",
    title: "9–12. Vom Euro zu AURA",
    blocks: [
      {
        kind: "ul",
        items: [
          "Stufe 1 — Einstieg in Euro.",
          "Stufe 2 — Euro und AURA nebeneinander.",
          "Stufe 3 — Belohnungen vor allem in AURA.",
          "Mitmachen heißt: Betriebe finden, Umfragen, ausprobieren, ehrlich Rückmeldung geben, Beiträge, Freunde holen, Aktionen, Aufgaben am Marktplatz.",
          "Eine Empfehlung zahlt erst, wenn die neue Person wirklich etwas geleistet hat. Kein Endlos-Anwerben.",
          "Betriebe zahlen fürs Abo, für KI, für Aktionen, für Zahlen, für Sichtbarkeit und für den Marktplatz — in Euro, in einem stabilen Coin oder in AURA, sobald das sauber geht.",
        ],
      },
    ],
  },
  {
    id: "utility",
    title: "13. Wozu der Token gut ist",
    blocks: [
      {
        kind: "ul",
        items: [
          "Bezahlen, wo Produkte und Dienste im Netz das erlauben",
          "Belohnung für geprüfte Arbeit und für Empfehlungen, die halten",
          "Zahlungen zwischen KI-Mitarbeitern und am Marktplatz",
          "Besserer Zugang und Vorteile für Betriebe",
          "Mitreden, wo Recht und Technik das hergeben",
          "Freiwillig festlegen für Stufen — niemals mit Zinsversprechen",
        ],
      },
    ],
  },
  {
    id: "spec",
    title: "14–20. So ist der Token aufgeteilt",
    blocks: [
      {
        kind: "lead",
        text: `Höchstens ${AURA_MAX_SUPPLY_DISPLAY_DE} AURA. Die Menge bleibt fest, außer eine spätere, offene Abstimmung ändert das ausdrücklich.`,
      },
      {
        kind: "table",
        headers: ["Wofür", "Anteil", "AURA"],
        rows: [...ALLOC_ROWS_DE, ["Summe", "100 %", AURA_MAX_SUPPLY_DISPLAY_DE]],
      },
      {
        kind: "p",
        text: `Team (${formatAuraAmount(93_333_333, "de")} AURA): ${AURA_TEAM_VESTING.noteDe} Wer privat oder strategisch kauft, hat festgelegte Sperren. Wie die Handelbarkeit geführt wird, soll man nachlesen können. Sperren, wenn es sie gibt, öffentlich prüfbar. Niemand verspricht einen festen Preis. Die Wallets der Firmenreserve sollen erkennbar sein, soweit das Recht das zulässt.`,
      },
      {
        kind: "notice",
        text: "Die Prozente sind ein Vorschlag, wie man teilt — keine fertige rechtliche Zuteilung und kein Verkauf.",
      },
    ],
  },
  {
    id: "emission",
    title: "21–24. Ausgabe, Belohnung, Betrug, Ruf",
    blocks: [
      {
        kind: "p",
        text: "Eine feste Obergrenze, und was rausgeht, wird dosiert — nicht endlos nachgedruckt. Belohnt wird geleistete Arbeit, nicht bloß Anwerben und nicht bloß Halten. Gegen Betrug: Ausweis, Gerätesignale, Doppelgänger finden, Wartezeiten, Obergrenzen, Handprüfung, Muster die die KI sieht. Der Ruf im System ist eine interne Note (Qualität, Streit, Betrugssignale) — das ist nicht dasselbe wie Token besitzen.",
      },
    ],
  },
  {
    id: "agents",
    title: "25–28. KI-Mitarbeiter, Karten, Umsatz",
    blocks: [
      {
        kind: "p",
        text: "Später sollen KI-Mitarbeiter AURA verdienen und ausgeben: für Anfragen, Aktionen, Hilfe, Recherche und Abläufe — Programme, die einander bezahlen. Eine Karte oder ein Ausgeben-Produkt darf nur über beaufsichtigte Partner kommen. AURA ist keine Bank, kein Zahlungsdienst und gibt keine Karten aus, außer das wäre extra erlaubt.",
      },
      {
        kind: "p",
        text: "Womit AURA Lokal verdient: Software-Abo, stärkere KI, Aktionen, Marktplatz-Gebühr, geprüfte Anfragen, Sichtbarkeit, Hinweise auf Finanzpartner, große Kunden. Preise als Beispiel: Einstieg 29 €, Wachstum 79 €, Pro 149 €, Große nach Gespräch — das muss der Markt erst zeigen. Die Abos von Aura OS sind ein eigenes Geschäft.",
      },
    ],
  },
  {
    id: "stages",
    title: "29–36. 1.000 Betriebe, danach, was es rechnet",
    blocks: [
      {
        kind: "ul",
        items: [
          "Stufe 1 (0–100): Das Gründungsteam verkauft selbst, geht hin, gibt Probezeit — zeigen, dass es passt.",
          "Stufe 2 (100–300): Texte, die sitzen. Botschafter. Seiten pro Branche. Der Einstieg läuft von selbst.",
          "Stufe 3 (300–600): Dicht in den Bezirken, Gruppen, Abende.",
          "Stufe 4 (600–1.000): Empfehlungen, die sich selbst tragen. Netz der Mitmacher. KI, die mitverkauft. Geschichten, die man zeigen kann.",
          "Dann Österreich, dann DACH, dann Europa, dann weiter. Wien ist die erste Wirtschaft — kein Software-Abfall, den man irgendwohin kippt.",
          "Beispiel: 1.000 Betriebe mal 79 € sind 79.000 € im Monat. Ein Rechenbeispiel, keine Prognose.",
          "20 € auf der Straße mal 1.000 Mitmacher sind 20.000 € Werbung. Gemessen wird: Wer bleibt? Wer ist echt? Wer kommt nach einer Woche, nach einem Monat wieder? Wer holt Freunde? Was ist ein Gast auf Dauer wert? Kein Lohn für Google-Sterne.",
        ],
      },
    ],
  },
  {
    id: "community",
    title: "37–43. Leute, Daten, Mitbestimmung, Recht",
    blocks: [
      {
        kind: "p",
        text: "Eine Wiener Gruppe — etwa auf WhatsApp — kann den Anfang beschleunigen. Dafür muss niemand seine Handynummer abliefern, wenn’s nicht nötig ist. DSGVO: so wenig Daten wie möglich, wer darf ran, Recht auf Löschen. Am Anfang entscheidet das Gründungsteam. Dann eine offene Firmenreserve. Dann Abstimmungen, wo sie Sinn haben. „Dezentral“ ist kein Werbespruch. Die Reserve: mehrere Schlüssel, Grenzen, Berichte wenn möglich.",
      },
      {
        kind: "notice",
        text: "AURA verkauft keine Google-Bewertungen, zahlt nicht dafür, verlangt keine fünf Sterne und keinen fertigen Text, zieht keine Scheinkampagnen auf und versteckt keine schlechten Stimmen. Eine Bewertung muss ein echter Besuch sein. Das steht im Produkt, nicht in der Fußnote.",
      },
    ],
  },
  {
    id: "moat",
    title: "44–48. Warum das größer ist als Sterne",
    blocks: [
      {
        kind: "p",
        text: "Der Weg ist: gefunden werden, Gast gewinnen, Erlebnis, Rückmeldung, Beitrag, wiederkommen, weitererzählen, Umsatz. Was uns schwer kopieren lässt, sind Betriebe plus Mitmacher plus Daten plus KI plus Reichweite plus Dichte in einer Stadt — nicht der Name des Tokens. AURA Lokal arbeitet in der echten Stadt. AURA OS lässt KI die Arbeit tun. AURA hält die Wirtschaft zusammen.",
      },
    ],
  },
  {
    id: "roadmap",
    title: "49–52. Fahrplan und woran wir uns messen",
    blocks: [
      {
        kind: "ul",
        items: [
          "Phase 0 — Bau, Rechtslage, erstes Lokal-Produkt, OS, Einstieg.",
          "Phase 1 — Wien: die ersten 100 Betriebe, die erste Gruppe die mitmacht, der Versuch auf der Straße.",
          "Phase 2 — der Weg zu 1.000 Betrieben und Geld, das jeden Monat wiederkommt.",
          "Phase 3 — AURA im Alltag: Belohnungen, Betriebe die damit zahlen, Handelbarkeit.",
          "Phase 4–7 — Österreich, DACH, Europa, weiter.",
          "Wir zählen: Betriebe die zahlen, monatlicher Umsatz, was ein neuer Betrieb kostet, wer abspringt, geprüfte Mitmacher, erledigte Aufgaben, wie oft betrogen wird, wie oft AURA wirklich wandert. Ziel sind 1.000 Betriebe die bleiben und zahlen — nicht leere Anmeldungen.",
        ],
      },
    ],
  },
  {
    id: "why-token",
    title: "53–56. Warum es den Token braucht",
    blocks: [
      {
        kind: "p",
        text: "Ohne Gemeinsames zahlt der Betrieb in Euro, der Macher über eine Plattform, die KI über Schnittstellen, der Gast in Punkten, die Empfehlung in Hausguthaben. AURA kann das eine Mittel sein. Nachfrage soll kommen, weil man etwas damit tun kann — Dienste, Belohnung, Zahlung zwischen Programmen, Zugang. Nicht weil jemand sagt, es wird teurer.",
      },
      {
        kind: "lead",
        text: "Dass etwas nützt, heißt nicht, dass es wertvoll bleibt. AURA kann fallen, unsichtbar werden oder scheitern. MiCA will, dass man das so sagt.",
      },
      {
        kind: "p",
        text: "AURA darf nicht an Google, WhatsApp, X, Meta, eine einzelne Kette oder einen einzelnen KI-Anbieter gekettet sein. Fällt eine Plattform um, läuft das Netz weiter.",
      },
    ],
  },
  {
    id: "risks",
    title: "55. Die großen Risiken",
    blocks: [
      {
        kind: "ul",
        items: [
          "Markt, Recht, Technik, Sicherheit",
          "Ob Leute mitmachen, ob andere schneller sind, ob man verkaufen kann, ob wir’s schaffen",
          "Betrug, wo Belohnungen fließen",
          "Wenn Google, WhatsApp oder andere die Regeln ändern",
        ],
      },
    ],
  },
  {
    id: "close",
    title: "57–60. Worum es geht",
    blocks: [
      {
        kind: "p",
        text: "Zuerst 1.000 Betriebe in Wien. Dann 10.000. Dann 100.000. Menschen machen Wert. Betriebe brauchen Gäste. KI macht die Arbeit. AURA hält die Wirtschaft zusammen. Die These ist nicht: kaufen, weil der Token steigt. Die These ist: eine echte Wirtschaft um lebende Produkte bauen, dicht, in Wien, zuerst.",
      },
      {
        kind: "lead",
        text: "Was nützt, soll auch etwas wert sein können. AURA OS. AURA Lokal. Building Culture. Ein Netz. Eine Wirtschaft.",
      },
      {
        kind: "notice",
        text: "Das hier ist nicht das fertige Papier, das das Gesetz für ein öffentliches Krypto-Angebot verlangt. Bevor AURA angeboten, zum Handel zugelassen oder beworben wird, holen wir Rat in Österreich und in der EU und machen die Angaben, die MiCA verlangt. AURA verspricht keinen Gewinn. Ob’s wird, hängt an der Arbeit, daran ob Leute mitmachen, am Recht, an der Technik — und daran, ob wirklich Wirtschaft passiert.",
      },
    ],
  },
];

export type WhitepaperLang = "en" | "de";

export function whitepaperFor(lang: WhitepaperLang) {
  return lang === "de"
    ? { meta: WHITEPAPER_META_DE, sections: AURA_WHITEPAPER_DE }
    : { meta: WHITEPAPER_META, sections: AURA_WHITEPAPER };
}
