/** Canonical Vienna origin + sticker drop. DE first, short EN twin. */

export const WIEN_VERTICALS = [
  "Friseur",
  "Kaffeehaus",
  "Beisl",
  "Studio",
  "Handwerk",
  "23 Bezirke",
] as const;

export const WIEN_ORIGIN = {
  kicker: "Wie’s zsamkemma is",
  kickerEn: "How it came together",
  lead: "Ned in einem WeWork. In Wien. Mit einer sterbenden Homepage, 4-Komma-irgendwas Sternen, und einem Cousin der gesagt hat: mach du des mit dem Internet.",
  leadEn:
    "Not in a WeWork. In Vienna. A dying homepage, 4-point-something stars, and a cousin who said: you do the internet thing.",
  close:
    "Wenn’s zwischen einem Friseur in Ottakring und einem Kaffeehaus im 7. funktioniert, darf’s die Stadt verlassen. Ned früher.",
  closeEn:
    "If it works between a barber in Ottakring and a café in the 7th, it can leave the city. Not before.",
  beats: [
    {
      no: "01",
      title: "Der Cousin",
      titleEn: "The cousin",
      de: "Ein Wiener Betrieb, Homepage auf Intensiv, Sterne so lala. Der Cousin: mach du des mit dem Internet. Wir: na gut, aber richtig.",
      en: "A Vienna shop, homepage on life support, stars so-so. The cousin: you do the internet. Us: fine — but properly.",
    },
    {
      no: "02",
      title: "Oida, ned des",
      titleEn: "Oida, not that",
      de: "Jemand bot Cash für Google-Sterne. Jemand anderer hat gesagt oida, ned des. Google verbietet’s. Und Wien merkt sich Schmäh.",
      en: "Someone offered cash for Google stars. Someone else said oida, not that. Google forbids it. Vienna remembers a scam.",
    },
    {
      no: "03",
      title: "Echte Besuche",
      titleEn: "Real visits",
      de: "Also eine Review-Maschine, die nur echte Besuche trackt. Dann Nachbarn. Dann Missionen. Kein Sterne-Kaufhaus.",
      en: "So a review machine that only tracks real visits. Then neighbors. Then missions. Not a star shop.",
    },
    {
      no: "04",
      title: "Eine Melange, eine Economy",
      titleEn: "One Melange, one economy",
      de: "Dann brauchte’s eine Economy, damit die Melange ned in IOUs zahlt wird. AURA. 777.777.777. Wien zuerst.",
      en: "Then we needed one economy so the Melange isn’t paid in IOUs. AURA. 777,777,777. Vienna first.",
    },
    {
      no: "05",
      title: "Dann die Stadt",
      titleEn: "Then the city",
      de: "1.000 Betriebe. 23 Bezirke. Wenn der Friseur und das Kaffeehaus im selben Netz sind, wird’s eine Ökonomie. Ned früher.",
      en: "1,000 businesses. 23 districts. When the barber and the café share a network, it becomes an economy. Not before.",
    },
  ],
} as const;

export const WIEN_STICKERS = {
  drop: "Drop 0",
  name: "AURA Wien Crew",
  blurb:
    "Erste Sticker der Collection. Für WhatsApp, für die Gasse, für später. Kein Token-Sale — nur Gesichter und Sprüche.",
  blurbEn:
    "First stickers of the collection. For WhatsApp, for the street, for later. Not a token sale — faces and lines.",
  howTo: [
    "Pack herunterladen (ZIP mit 512×512 PNGs).",
    "Auf dem Handy in Sticker Maker / WhatsApp Sticker öffnen.",
    "Als eigenes Pack speichern. Tray-Icon liegt bei.",
  ],
  zip: "/stickers/aura-wien-drop-0.zip",
  tray: "/stickers/tray.png",
  items: [
    { id: "laszlo", src: "/stickers/laszlo.png", label: "Laszlo" },
    { id: "martina", src: "/stickers/martina.png", label: "Martina" },
    { id: "darco", src: "/stickers/darco.png", label: "Darco" },
    { id: "evreen", src: "/stickers/evreen.png", label: "Evreen" },
    { id: "martin", src: "/stickers/martin.png", label: "Martin" },
    { id: "oida", src: "/stickers/oida.png", label: "Oida" },
    { id: "passt-scho", src: "/stickers/passt-scho.png", label: "Passt scho" },
    { id: "ned-fake-sterne", src: "/stickers/ned-fake-sterne.png", label: "Ned Fake-Sterne" },
    { id: "tausend-betriebe", src: "/stickers/tausend-betriebe.png", label: "1.000 Betriebe" },
    { id: "nachbar", src: "/stickers/nachbar.png", label: "Nachbar!" },
    { id: "melange-first", src: "/stickers/melange-first.png", label: "Melange first" },
  ],
} as const;
