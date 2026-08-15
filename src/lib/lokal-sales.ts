import {
  AURA_REPUTATION_CASH_EUR,
  AURA_REPUTATION_EUR,
} from "@/lib/boost-packs";

/** Field-sales deck for Aura Lokal. German a Wiener owner can hear at the counter. */

export const LOKAL_SALES = {
  product: "Aura Lokal",
  offer: "Aura Reputation",
  url: "https://aibusiness.fun/lokal",
  auditUrl: "https://aibusiness.fun/lokal/audit",
  liveUrl: "https://aibusiness.fun/verkauf",
  deckHref: "/Aura_Lokal_Verkauf.pptx",
  monthlyEur: AURA_REPUTATION_EUR,
  cashEur: AURA_REPUTATION_CASH_EUR,
  cashMonths: 3,
} as const;

export type SalesSlide = {
  id: string;
  kicker: string;
  title: string;
  lines: string[];
  say: string;
};

export const LOKAL_SALES_SLIDES: SalesSlide[] = [
  {
    id: "cover",
    kicker: "Aura Lokal · Wien",
    title: "Mehr echte Sterne.\nGäste, die wiederkommen.",
    lines: [
      "Für Friseur, Beauty, Gastro, Handwerk, Immobilien.",
      "Kein Agentur-Theater. Keine Fake-Sterne.",
    ],
    say: "Nicht das Betriebssystem verkaufen. Das Ergebnis: nach dem Besuch fragen — höflich, du gibst frei, Google bleibt ehrlich.",
  },
  {
    id: "pain",
    kicker: "01 · Der Alltag",
    title: "Gute Arbeit.\nStille Google-Seite.",
    lines: [
      "Zufriedene Gäste gehen — und vergessen die Bewertung.",
      "Instagram, wenn’s einfällt. WhatsApp-Chaos. Eine Agentur, die teuer ist.",
      "Wer nicht fragt, bekommt keine Sterne. Wer falsch fragt, riskiert Google.",
    ],
    say: "Frag: Wann hat zuletzt jemand von selbst bewertet? Die meisten sagen: selten. Genau da setzen wir an.",
  },
  {
    id: "want",
    kicker: "02 · Was der Betrieb will",
    title: "Drei Dinge. Nicht fünfzig Features.",
    lines: [
      "Mehr echte Google-Bewertungen — von Leuten, die wirklich da waren.",
      "Gäste, die wiederkommen, weil jemand nachfasst.",
      "Sichtbar bleiben, ohne eine Agentur zu füttern.",
    ],
    say: "Warten bis der Mensch nickt. Dann erst der Preis. Wenn er über KI oder Token redet: zurück auf Sterne und Gäste.",
  },
  {
    id: "offer",
    kicker: "03 · Das Angebot",
    title: `Aura Reputation\n${AURA_REPUTATION_EUR} € im Monat.`,
    lines: [
      "Nach dem Besuch liegt eine höfliche Einladung bereit.",
      "Du tippst Freigeben. Fertig.",
      "Gäste können einchecken. Du bestätigst. Beziehungen bleiben lokal.",
    ],
    say: "Ein Abo. Kein Paket-Salat am Tisch. Boost und Extra kommt später, wenn der Laden läuft.",
  },
  {
    id: "steps",
    kicker: "04 · So startet ihr",
    title: "Drei Schritte.\nHeute.",
    lines: [
      "1 · Kostenloser Check — Name, Stadt, Google-Link. Eine Minute.",
      "2 · Konto anlegen, Betrieb benennen.",
      `3 · Freischalten: ${AURA_REPUTATION_EUR} €/Monat mit Karte — oder Bar, Code an der Theke.`,
    ],
    say: "Am Tisch den Check machen. Handy des Betriebs, nicht deins. Screenshot vom Ergebnis. Dann zahlen oder Code.",
  },
  {
    id: "gets",
    kicker: "05 · Was du bekommst",
    title: "Sterne. Gäste. Posts.",
    lines: [
      "Sterne — Einladungen an echte Kunden. Klicks. Keine gekauften Texte.",
      "Gäste — QR oder Code. Du bestätigst den Besuch.",
      "Posts — Entwürfe warten. Du gibst frei, wenn’s passt.",
    ],
    say: "Zeig Heute in der App, wenn du eingeloggt bist. Sonst diese drei Wörter. Nicht das ganze OS.",
  },
  {
    id: "trust",
    kicker: "06 · Was wir nie tun",
    title: "Keine Fake-Sterne.\nNiemals. Punkt.",
    lines: [
      "Kein Geld für eine Google-Bewertung.",
      "Kein fertiger Text, den der Gast abschreiben soll.",
      "Keine Bots, keine gekauften Profile, keine fünf Sterne als Bedingung.",
    ],
    say: "Wenn jemand nach gekauften Sternen fragt: oida, ned des. Google verbietet’s. Wien merkt sich Schmäh. Wir belohnen den Besuch — nicht die Sterne.",
  },
  {
    id: "price",
    kicker: "07 · Preis",
    title: "Klar. Klein. Jeden Monat kündbar.",
    lines: [
      `${AURA_REPUTATION_EUR} € im Monat mit Karte.`,
      `${AURA_REPUTATION_CASH_EUR} € bar — ungefähr ${LOKAL_SALES.cashMonths} Monate, Code an der Theke.`,
      "Zuerst der Check. Der kostet nichts.",
    ],
    say: "Nicht verhandeln unter 49. Bar ist der Code, nicht ein Rabatt. Wenn’s zu viel ist: Check dalassen, in einer Woche wiederkommen.",
  },
  {
    id: "objections",
    kicker: "08 · Wenn’s hakt",
    title: "Kurze Antworten.",
    lines: [
      "Keine Zeit — du gibst nur frei. Den Rest legt Aura bereit.",
      "Ich zahl schon für Insta — das hier ist nach dem Besuch, nicht statt dem Feed.",
      "Bringt das was — wir zählen Einladungen und Klicks. Keine Fantasie-Sterne.",
      "Ist das erlaubt — ja, weil wir nicht für Reviews zahlen.",
    ],
    say: "Ein Einwand, eine Antwort, dann zurück zum Check. Nicht diskutieren.",
  },
  {
    id: "close",
    kicker: "09 · Heute",
    title: "Check machen.\nOder gleich starten.",
    lines: [
      "aibusiness.fun/lokal/audit — eine Minute, am Tisch.",
      "aibusiness.fun/lokal — Konto, dann freischalten.",
      "Link dalassen. In drei Tagen nachfassen.",
    ],
    say: "Schluss mit einer Handlung. Check öffnen oder Code schreiben. Nicht „ich schick dir was“ ohne Termin.",
  },
];

export const LOKAL_SALES_WHATSAPP =
  `Aura Lokal — echte Sterne und Nachbetreuung, ${AURA_REPUTATION_EUR} €/Monat, keine Fake-Reviews.\nCheck: ${LOKAL_SALES.auditUrl}\nStart: ${LOKAL_SALES.url}`;
