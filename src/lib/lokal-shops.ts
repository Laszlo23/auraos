/** Editorial extras for known shops. Never invent reviews or star counts. */

export type LokalServiceSpotlight = {
  title: string;
  blurb: string;
};

export type LokalShopEditorial = {
  story: string;
  services: string[];
  serviceDetails: LokalServiceSpotlight[];
  secondStudioNote?: string;
  googleFindCopy?: string;
  ownerAvatar?: string;
  ownerLabel?: string;
  webLabel?: string;
  howSteps?: { title: string; body: string }[];
  /** Public social links shown on /b/$slug */
  socials?: { label: string; href: string }[];
};

export const LOKAL_SHOP_EDITORIAL: Record<string, LokalShopEditorial> = {
  "koerperglanz-shapeline": {
    story:
      "Körperglanz & Shape-Line ist deine Wohlfühloase mitten in Wien oder Mödling. Wir verbinden straffende Behandlungen mit exklusiven Beauty-Treatments, um dir ein einzigartiges Erlebnis zu bieten.",
    services: [
      "BodyShapen",
      "The Shape-Line Slimmer",
      "EMF Styler",
      "Beckenboden Trainer",
      "Körperbehandlungen",
      "Anti Cellulite",
      "Kosmetik",
    ],
    serviceDetails: [
      { title: "BodyShapen", blurb: "Bring Bewegung in dein Leben." },
      { title: "The Shape-Line Slimmer", blurb: "Die ultimative Behandlung für den Zentimeterverlust." },
      { title: "EMF Styler", blurb: "Muskelaufbau trifft auf Tiefenwirkung." },
      { title: "Beckenboden Trainer", blurb: "Ein starker Beckenboden verbessert Lebensqualität und Gesundheit." },
      { title: "Körperbehandlungen", blurb: "Körperbehandlungen für dein Wohlgefühl." },
      { title: "Anti Cellulite", blurb: "Gezielte Straffung für feste Haut." },
      { title: "Kosmetik", blurb: "Bringe deine Haut zum Strahlen." },
    ],
    secondStudioNote: "Zweites Studio in Mödling: Neudorfer Straße 2, 2340 — kein zweites Listing.",
    googleFindCopy: "Gäste finden uns auf Google",
    ownerAvatar: "/crew/martina.png",
    ownerLabel: "Inhaberin",
  },
  "pion-professional": {
    story:
      "Pion Professional ist Premium-Männerpflege aus Wien. Evren Demir führt den Vertrieb — Showroom und Büro in der Seestadt, Handelspartner in ganz Österreich. After-Shave, Care Creams, Haar- und Styling-Linien. Persönliche Beratung, keine Fake-Sterne.",
    services: [
      "After Shave & Cologne",
      "Black Edition Care Cream",
      "Haar-Shampoo & Conditioner",
      "Aqua Wax & Clay Wax",
      "Powder Styling",
      "Fachberatung",
      "Handelspartner",
    ],
    serviceDetails: [
      { title: "After Shave & Cologne", blurb: "Rasur-Essentials und Colognes — vom Showroom ins Fachgeschäft." },
      { title: "Black Edition Care Cream", blurb: "Blackberry, Pomegranate, Olive Leaf, Classic — Pflege für Hände und Gesicht." },
      { title: "Haar-Shampoo & Conditioner", blurb: "Keratin-Linie für den modernen Mann, Salon- und Heimgrößen." },
      { title: "Aqua Wax & Clay Wax", blurb: "Styling-Wachs für Halt ohne Theater." },
      { title: "Powder Styling", blurb: "P1 Powder Wax — light control, ohne Verklebung." },
      { title: "Fachberatung", blurb: "Termin im Showroom Seestadt. Evren erklärt die Linie persönlich." },
      { title: "Handelspartner", blurb: "Vertrieb in Fachgeschäfte — österreichweit, echter Kontakt statt Kaltakquise-Spam." },
    ],
    googleFindCopy: "Pion in der Seestadt finden",
    ownerAvatar: "/crew/evreen.png",
    ownerLabel: "Vertrieb",
    webLabel: "Shop",
    howSteps: [
      { title: "Termin", body: "Showroom in der Seestadt — vorher anschreiben, dann kommst du vorbei." },
      { title: "Check-in", body: "QR scannen — du wirst Nachbar. Kein Theater." },
      { title: "Google", body: "Optional, ohne Belohnung für Sterne." },
    ],
  },
  "cafe-vision-lounge": {
    story:
      "Cafe Vision & Lounge ist mehr als ein gewöhnliches Kaffeehaus — Linzer Straße 74 in Wien-Penzing. Frühstückskaffee, Snacks, Lounge und Außenbereich. Betrieben als VISION Lounge GmbH. Keine Fake-Sterne — echte Gäste, echter Check-in.",
    services: ["Frühstück", "Kaffee", "Snacks", "Lounge", "Außenbereich"],
    serviceDetails: [
      { title: "Frühstück", blurb: "Sichere dir früh einen Platz — Kaffee und Start in den Tag." },
      { title: "Kaffee", blurb: "Kaffeehaus-Klassiker, ohne Theater." },
      { title: "Snacks", blurb: "Kleine Snacks zum Zeitunglesen und Treffen mit Freunden." },
      { title: "Lounge", blurb: "Lounge-Atmosphäre — länger bleiben, wenn du willst." },
      { title: "Außenbereich", blurb: "Draußen sitzen, wenn das Wetter mitspielt." },
    ],
    googleFindCopy: "Gäste finden uns auf Google",
    ownerLabel: "Geschäftsführerin",
    webLabel: "Website",
    howSteps: [
      { title: "Besuch", body: "Linzer Straße 74, 1140 — rein, Platz nehmen." },
      { title: "Check-in", body: "QR scannen — du wirst Nachbar. Kein Theater." },
      { title: "Google", body: "Optional, ohne Belohnung für Sterne." },
    ],
  },
  "das-melt": {
    story:
      "Im Herzen des 2. Bezirks, zwischen Prater und Schwedenplatz: Das Melt ist modernes Bistro & Bar in der Schmelzgasse 9. Internationale Küche, Mittagsmenü, Brunch, Drinks — gegründet aus Freundschaft von Nemanja Biorac (Küche) und Aleksandar Milojković (Gastgeber). Events & Catering, keine Fake-Sterne.",
    services: [
      "Internationale Küche",
      "Mittagstisch",
      "Brunch",
      "Bar & Drinks",
      "Events",
      "Catering",
      "Reservierung",
    ],
    serviceDetails: [
      {
        title: "Internationale Küche",
        blurb: "Vorspeisen, Hauptgerichte, Desserts — Fusion mit regionalem Fokus.",
      },
      {
        title: "Mittagstisch",
        blurb: "Mittagsmenü unter der Woche — rein, essen, weiter.",
      },
      {
        title: "Brunch",
        blurb: "Wochenende-Feeling am Tisch — wenn die Karte es hergibt.",
      },
      {
        title: "Bar & Drinks",
        blurb: "Bistro und Bar in einem — Date, Dinner oder Quizabend.",
      },
      {
        title: "Events",
        blurb: "Geburtstage, Firmenfeier, private Runden — Raum und Team vor Ort.",
      },
      {
        title: "Catering",
        blurb: "Melt kommt zu dir — Fingerfood bis Menü, Wien und Umgebung.",
      },
      {
        title: "Reservierung",
        blurb: "Tisch online oder anrufen — oft voll im Leopoldstadt-Kiez.",
      },
    ],
    googleFindCopy: "Das Melt auf Google finden",
    ownerLabel: "Gastgeber",
    webLabel: "Website",
    socials: [{ label: "Instagram", href: "https://www.instagram.com/dasmeltvienna" }],
    howSteps: [
      { title: "Besuch", body: "Schmelzgasse 9, 1020 — zwischen Prater und Schwedenplatz." },
      { title: "Check-in", body: "QR scannen — du wirst Nachbar im 2." },
      { title: "Google", body: "Optional, ohne Belohnung für Sterne." },
    ],
  },
  "tante-liesl": {
    story:
      "Bei Tante Liesl wird gekocht, gelacht & genossen — Servitengasse 7, mitten im Servitenviertel neben der Kirche. Traditionelle Wiener Küche mit modernem Twist: Schnitzel, Grammelknödel, Schwammerlgulasch, Sonntagsbraten. Gastgarten unter Bäumen im Sommer. Bodenständig, nachbarschaftlich, keine Fake-Sterne.",
    services: [
      "Wiener Küche",
      "Mittagstisch",
      "Sonntagsbraten",
      "Gastgarten",
      "Vegetarisch",
      "Reservierung",
    ],
    serviceDetails: [
      {
        title: "Wiener Küche",
        blurb: "Klassiker und Hausgerichte — Grammelknödel, Schwammerlgulasch, Schnitzel.",
      },
      {
        title: "Mittagstisch",
        blurb: "Mo–Fr wechselndes Tagesgericht, fair kalkuliert.",
      },
      {
        title: "Sonntagsbraten",
        blurb: "Der Sonntag hat seinen Platz — wie’s sich gehört.",
      },
      {
        title: "Gastgarten",
        blurb: "Schattige Terrasse zum Servitenplatz — im Sommer heiß begehrt.",
      },
      {
        title: "Vegetarisch",
        blurb: "Auch ohne Fleisch: z. B. Schwammerl-Beuschel, Erbsentascherl.",
      },
      {
        title: "Reservierung",
        blurb: "Oft voll — vorher anrufen lohnt sich.",
      },
    ],
    googleFindCopy: "Tante Liesl auf Google finden",
    ownerLabel: "Gastgeberin",
    webLabel: "Website",
    socials: [
      { label: "Instagram", href: "https://www.instagram.com/tante.liesl" },
      { label: "Facebook", href: "https://www.facebook.com/gasthaustanteliesl" },
    ],
    howSteps: [
      { title: "Besuch", body: "Servitengasse 7, 1090 — neben der Servitenkirche." },
      { title: "Check-in", body: "QR scannen — du wirst Nachbar im Grätzl." },
      { title: "Google", body: "Optional, ohne Belohnung für Sterne." },
    ],
  },
  "darko-auto-wien": {
    story:
      "Darko Tanackovic ist der Fachmann für Autoankauf und Autoverkauf in Wien. Straße zuerst: ehrliche Bewertung, klarer Preis, Abwicklung ohne Druck. Kein erfundener Schauraum, keine gekauften Sterne — Termin, dann der Wagen.",
    services: [
      "Autoankauf",
      "Autoverkauf",
      "Faire Bewertung",
      "Abholung in Wien",
      "Kaufvertrag",
      "Abmeldung",
    ],
    serviceDetails: [
      { title: "Autoankauf", blurb: "Gebrauchtwagen in Wien — Zustand ehrlich ansprechen, dann ein klares Angebot." },
      { title: "Autoverkauf", blurb: "Wenn Darko ein Auto weitergibt, sollst du wissen was du kaufst." },
      { title: "Faire Bewertung", blurb: "Kein Höchstpreis-Geschrei. Eine Zahl, die hält." },
      { title: "Abholung in Wien", blurb: "23 Bezirke. Termin, dann holt er den Wagen — Adresse folgt nach Claim." },
      { title: "Kaufvertrag", blurb: "Schriftlich, verständlich, fertig." },
      { title: "Abmeldung", blurb: "Zulassungsstelle und Papierkram, wenn ihr das so wollt." },
    ],
    secondStudioNote:
      "Kein erfundener Fixstandort. Darko fährt Wienweit nach Termin — Straße und Telefon trägt er nach dem Claim selbst ein.",
    googleFindCopy: "Darko nach dem Besuch auf Google finden",
    ownerAvatar: "/crew/darco.png",
    ownerLabel: "Fachmann",
    howSteps: [
      { title: "Termin", body: "Schreib oder ruf an, wenn die Nummer steht. Dann schaut er sich den Wagen an." },
      { title: "Check-in", body: "QR scannen nach dem Termin — echter Besuch, nicht ein Sterne-Deal." },
      { title: "Google", body: "Optional, ohne Belohnung für Sterne." },
    ],
  },
  "aura-os": {
    story:
      "Aura OS ist das Betriebssystem für KI-Firmen. Du besitzt die Firma. Atlas und die Belegschaft führen aus — nach deiner Freigabe. Produkt zuerst, Token zuletzt. Wien.",
    services: ["AI company OS", "Founding seat", "Missionen", "Proof", "Workforce"],
    serviceDetails: [
      { title: "AI company OS", blurb: "Eine Firma wecken, nicht ein Chatfenster öffnen." },
      { title: "Founding seat", blurb: "$99 einmalig. Abo und Compute extra." },
      { title: "Missionen", blurb: "Du gibst das Ziel. Der CEO zerlegt. Du genehmigst." },
      { title: "Proof", blurb: "Zeitstempel, Ergebnis, Kosten — kein Demo-Theater." },
      { title: "Workforce", blurb: "Atlas, Vela, Juno, Orin, Ledger — echte Rollen." },
    ],
    ownerAvatar: "/crew/laszlo.png",
    ownerLabel: "Operator",
    webLabel: "Aura OS",
    howSteps: [
      { title: "Beschreiben", body: "Ein Satz reicht." },
      { title: "Wecken", body: "Die Firma steht. Du gibst die erste Mission." },
      { title: "Proof", body: "Fertige Arbeit hinterlässt Belege." },
    ],
  },
  "aura-lokal": {
    story:
      "Aura Local ist das Netz für Wiener Betriebe: echte Besuche, Check-ins, Review-Einladungen — nie Fake-Sterne. Martina, Evren, Darko und das Gründungsteam zuerst.",
    services: ["Betriebskarte", "Review-Einladungen", "Nachbar-Check-in", "Katalog", "Termine"],
    serviceDetails: [
      { title: "Betriebskarte", blurb: "Öffentliche /b-Seite statt toter Google-Stille." },
      { title: "Review-Einladungen", blurb: "Nach dem Besuch. Der Gast schreibt selbst." },
      { title: "Nachbar-Check-in", blurb: "QR am Tresen. Bestätigung durch den Betrieb." },
      { title: "Katalog", blurb: "Leistungen, Produkte, Tickets — was du wirklich anbietest." },
      { title: "Termine", blurb: "Anfrage hier oder dein externes Buchungssystem." },
    ],
    ownerAvatar: "/crew/martina.png",
    ownerLabel: "Wien",
    webLabel: "Lokal",
    howSteps: [
      { title: "Karte", body: "Betrieb öffentlich — Leistungen und Termine, die du wirklich anbietest." },
      { title: "Besuch", body: "Check-in und Review-Einladung nach dem echten Termin." },
      { title: "Netz", body: "Nachbar bringt Gäste. Keine Fake-Sterne." },
    ],
  },
  "aura-nachbar": {
    story:
      "Aura Nachbar ist die Gäste-App: Check-in im Laden, Guthaben verdienen, Freunde mitbringen. Keine Belohnung für Google-Sterne.",
    services: ["Check-in", "Guthaben", "Freunde", "Entdecken"],
    serviceDetails: [
      { title: "Check-in", blurb: "QR oder Code. Der Laden bestätigt den Besuch." },
      { title: "Guthaben", blurb: "Für echte Besuche — nicht für Sterne." },
      { title: "Freunde", blurb: "Wer mitkommt und eincheckt, zählt." },
      { title: "Entdecken", blurb: "Läden im Wien-Netz, ohne Fake-Verzeichnis." },
    ],
    ownerLabel: "Gäste",
    webLabel: "Nachbar",
    howSteps: [
      { title: "Konto", body: "Kostenlos. Kein Investment." },
      { title: "Check-in", body: "QR am Tresen, dann wartet der Laden auf Bestätigung." },
      { title: "Wiederkommen", body: "Guthaben und Freunde — der Laden bleibt im Netz." },
    ],
  },
};

export function editorialForSlug(slug: string | null | undefined): LokalShopEditorial | null {
  if (!slug) return null;
  return LOKAL_SHOP_EDITORIAL[slug] ?? null;
}

export function defaultShopStory(parts: {
  name: string;
  city?: string | null;
  niche?: string | null;
}): string {
  const where = parts.city?.trim() ? ` in ${parts.city.trim()}` : "";
  const niche = parts.niche?.trim() ? ` · ${parts.niche.trim()}` : "";
  return `${parts.name} ist ein lokaler Betrieb${where}${niche}. Hier checkst du als Nachbar ein und findest uns auf Google — echte Besuche, keine erfundenen Sterne.`;
}

export function formatShopAddress(parts: {
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  district?: string | null;
}): string | null {
  const line = [parts.street, [parts.postal_code, parts.city].filter(Boolean).join(" ")]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("0") && !digits.startsWith("00")) {
    return `tel:+43${digits.slice(1)}`;
  }
  return `tel:${digits}`;
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function checkinQrUrl(deepLink: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(deepLink)}`;
}
