/**
 * Shared language / brand rules for every AI writer in Aura OS.
 * Stops nonsense like translating "Discord" → "Zwietracht".
 */

/** Product and channel names that must stay exactly as written in every language. */
export const NEVER_TRANSLATE_BRANDS = [
  "Aura OS",
  "Aura",
  "AURA",
  "Atlas",
  "Vela",
  "Orin",
  "Iris",
  "Cass",
  "Juno",
  "Ledger",
  "Quant",
  "Sable",
  "Discord",
  "Telegram",
  "LinkedIn",
  "Farcaster",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "YouTube",
  "TikTok",
  "USDC",
  "x402",
  "Base",
  "Alchemy",
  "Building Culture",
] as const;

/** Common LLM mistranslations → correct brand spelling. */
const BRAND_FIXUPS: Array<[RegExp, string]> = [
  [/\bZwietracht\b/gi, "Discord"],
  [/\bZwist\b/gi, "Discord"],
  [/\b(auf|im|zum|ins|unser(?:em)?|eurem?)\s+Telegramm\b/gi, "$1 Telegram"],
  [/\bTelegramm(-Kanal|-Gruppe|-Server|-Community)\b/gi, "Telegram$1"],
  [/\bLinked[\s-]?In\b/gi, "LinkedIn"],
  [/\bFace[\s-]?book\b/gi, "Facebook"],
  [/\bYou[\s-]?Tube\b/gi, "YouTube"],
  [/\bTik[\s-]?Tok\b/gi, "TikTok"],
  [/\bWhats[\s-]?App\b/gi, "WhatsApp"],
  [/\bFar[\s-]?caster\b/gi, "Farcaster"],
];

export type AiLang = "de" | "en";

export function normalizeAiLang(raw: string | null | undefined): AiLang {
  const v = (raw ?? "en").trim().toLowerCase();
  if (v === "de" || v.startsWith("de-") || v === "german" || v === "deutsch") return "de";
  return "en";
}

/** Lightweight heuristic: treat as German if enough DE function words appear. */
export function detectAiLang(text: string): AiLang {
  const sample = text.slice(0, 800).toLowerCase();
  const deHits =
    (sample.match(/\b(und|oder|nicht|ich|wir|sie|ihr|bitte|danke|hallo|guten|für|mit|auch|schon|noch|dass|aber|wenn|kann|habe|wird|eine|einen|der|die|das)\b/g) ??
      []).length;
  const enHits =
    (sample.match(/\b(the|and|or|not|you|we|please|thanks|hello|for|with|also|that|but|when|can|have|will|a|an)\b/g) ??
      []).length;
  if (deHits >= 3 && deHits > enHits) return "de";
  return "en";
}

/**
 * Prompt block injected into system / instruction strings.
 * Keep short — models follow concrete bans better than essays.
 */
export function languageStyleBlock(langRaw: string | null | undefined): string {
  const lang = normalizeAiLang(langRaw);
  const brands = NEVER_TRANSLATE_BRANDS.join(", ");

  const shared = `BRAND NAMES — NEVER TRANSLATE (keep exact spelling, never localize):
${brands}
Also never translate: X (the platform formerly Twitter), "tweet", "Discord server".
Forbidden examples: Discord→Zwietracht/Zwist, Telegram→Telegramm (as product), LinkedIn→"Verknüpftes In".`;

  if (lang === "de") {
    return `${shared}

LANGUAGE: German (de). Write natural, easy-to-read German a real person would send.
- Prefer short sentences. Active voice. Concrete verbs.
- B2B outreach: formal "Sie". Social replies: match the commenter's tone (du/Sie).
- No bureaucratic stuffing ("hiermit", "bezüglich Ihrer Anfrage vom…", "anbei").
- No fake Anglicisms mashed into German. Real product names stay English.
- Numbers and currency stay clear (z. B. 50 USDC, nicht "fünfzig US-Dollar-Coins" unless asked).
- Sound warm and precise — not stiff translationese.`;
  }

  return `${shared}

LANGUAGE: English (en). Clear, short, calm. Same brand-name rules.`;
}

/** Repair common brand mistranslations after generation. */
export function sanitizeBrandNames(text: string): string {
  let out = text;
  for (const [re, fixed] of BRAND_FIXUPS) {
    out = out.replace(re, fixed);
  }
  // "X (ehemals Twitter)" is fine; leave it. Fix "Twitter" product refs only if needed.
  return out;
}
