import { SITE_URL } from "@/lib/site";

export type LeadDigestMeta = {
  kind?: string;
  portal?: string;
  price?: string | null;
  rooms?: number | null;
  area_m2?: number | null;
  deal?: string;
  private_seller?: boolean;
};

export type LeadDigestLead = {
  id: string;
  name: string | null;
  org: string | null;
  email: string | null;
  phone: string | null;
  source_url: string | null;
  address: string | null;
  snippet: string | null;
  score: number | null;
  created_at: string;
  metadata?: LeadDigestMeta | null;
};

/** First token of "Sonja Immobilien" → "Sonja" when it looks like a given name. */
export function greetingFromCompanyName(name: string): string | null {
  const first = (name.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}-]/gu, "");
  if (first.length < 3 || first.length > 20) return null;
  if (/^(The|Der|Die|Das|Aura|GmbH|Immobilien)$/i.test(first)) return null;
  if (!/^\p{Lu}[\p{Ll}-]+$/u.test(first)) return null;
  return first;
}

export type LeadDigestCopy = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function leadTitle(l: LeadDigestLead): string {
  return (l.org || l.name || "Lead").trim();
}

function listingBits(l: LeadDigestLead, de: boolean): string[] {
  const m = l.metadata;
  if (!m || m.kind !== "listing") return [];
  const bits: string[] = [];
  if (m.price) bits.push(m.price);
  if (m.rooms) bits.push(de ? `${m.rooms} Zimmer` : `${m.rooms} rooms`);
  if (m.area_m2) bits.push(`${m.area_m2} m²`);
  if (m.portal) bits.push(m.portal);
  if (m.private_seller) bits.push(de ? "provisionsfrei / privat" : "no commission / private");
  return bits;
}

/** Local wall-clock parts in a named IANA timezone. */
export function zonedParts(
  date: Date,
  timeZone: string,
): { y: number; m: number; d: number; h: number; dateKey: string } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  let h = Number(parts.hour);
  // Some engines emit "24" for midnight — normalize.
  if (h === 24) h = 0;
  const dateKey = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { y, m, d, h, dateKey };
}

export function digestSlotForHour(dateKey: string, hour: number): string {
  return `${dateKey}-${String(hour).padStart(2, "0")}`;
}

/** True when local hour matches a configured digest hour (same calendar hour). */
export function shouldSendDigestNow(opts: {
  now?: Date;
  timezone: string;
  hours: number[];
  lastSentSlot: string | null | undefined;
}): { due: boolean; slot: string; hour: number; dateKey: string } {
  const now = opts.now ?? new Date();
  const { h, dateKey } = zonedParts(now, opts.timezone);
  const hours = opts.hours.filter((n) => Number.isInteger(n) && n >= 0 && n <= 23);
  const match = hours.includes(h);
  const slot = digestSlotForHour(dateKey, h);
  if (!match) return { due: false, slot, hour: h, dateKey };
  if (opts.lastSentSlot === slot) return { due: false, slot, hour: h, dateKey };
  return { due: true, slot, hour: h, dateKey };
}

export function buildLeadDigestEmail(opts: {
  companyName: string;
  language: "de" | "en";
  slotHour: number;
  newLeads: LeadDigestLead[];
  recentLeads: LeadDigestLead[];
}): LeadDigestCopy {
  const de = opts.language === "de";
  const greeting = greetingFromCompanyName(opts.companyName);
  const hi = greeting ? (de ? `Hallo ${greeting},` : `Hi ${greeting},`) : de ? "Hallo," : "Hi,";
  const when = opts.slotHour < 12 ? (de ? "Morgen" : "morning") : de ? "Nachmittag" : "afternoon";
  const listingCount = opts.newLeads.filter((l) => l.metadata?.kind === "listing").length;
  const n = opts.newLeads.length;
  const noun =
    listingCount > 0 && listingCount === n
      ? de
        ? n === 1
          ? "neues Inserat"
          : "neue Inserate"
        : n === 1
          ? "new listing"
          : "new listings"
      : de
        ? n === 1
          ? "neuer Lead"
          : "neue Leads"
        : n === 1
          ? "new lead"
          : "new leads";
  const who = greeting || opts.companyName;
  const subject =
    n > 0
      ? de
        ? greeting
          ? `${greeting}, ${n} ${noun} für dich (${when})`
          : `${opts.companyName} · ${n} ${noun} (${when})`
        : greeting
          ? `${greeting}, ${n} ${noun} for you (${when})`
          : `${opts.companyName} · ${n} ${noun} (${when})`
      : de
        ? `${who} · Lead-Update (${when}) — keine neuen seit dem letzten Versand`
        : `${who} · Lead update (${when}) — no new leads since last send`;

  const lines: string[] = [];
  lines.push(hi);
  lines.push(``);
  if (de) {
    lines.push(
      n > 0
        ? `hier ist dein ${when}-Digest für ${opts.companyName}: ${n} ${noun} seit dem letzten Versand — frisch von den österreichischen Portalen, passend zu deinen Kriterien.`
        : `hier ist dein ${when}-Digest für ${opts.companyName}. Seit dem letzten Versand sind keine neuen Leads dazugekommen — unten die letzten Einträge zur Übersicht.`,
    );
  } else {
    lines.push(
      n > 0
        ? `here is your ${when} digest for ${opts.companyName}: ${n} ${noun} since the last send — fresh from the Austrian portals, matched to your brief.`
        : `here is your ${when} digest for ${opts.companyName}. No new leads since the last send — recent ones below for context.`,
    );
  }
  lines.push(``);

  const block = opts.newLeads.length > 0 ? opts.newLeads : opts.recentLeads.slice(0, 8);
  if (block.length === 0) {
    lines.push(de ? "Noch keine Leads in der Akte." : "No leads on file yet.");
  } else {
    block.forEach((l, i) => {
      const extras = listingBits(l, de);
      lines.push(`${i + 1}. ${leadTitle(l)}${extras.length ? ` · ${extras.join(" · ")}` : ""}`);
      if (l.email) lines.push(`   ${de ? "E-Mail" : "Email"}: ${l.email}`);
      if (l.phone) lines.push(`   ${de ? "Tel" : "Phone"}: ${l.phone}`);
      if (l.address) lines.push(`   ${de ? "Ort" : "Place"}: ${l.address}`);
      if (l.source_url) lines.push(`   URL: ${l.source_url}`);
      if (l.snippet) lines.push(`   ${l.snippet.replace(/\s+/g, " ").trim().slice(0, 220)}`);
      lines.push(``);
    });
  }

  lines.push(de ? `Alle Leads in der Console:` : `All leads in the console:`);
  lines.push(`${SITE_URL}/akquise`);
  lines.push(``);
  lines.push(de ? `— Aura OS · Immobilien-Desk` : `— Aura OS · Realty desk`);

  const text = lines.join("\n");

  const htmlItems = block
    .map((l) => {
      const extras = listingBits(l, de);
      const bits = [
        `<strong>${escapeHtml(leadTitle(l))}</strong>`,
        extras.length
          ? `<span style="color:#1a5c3a;font-size:13px">${escapeHtml(extras.join(" · "))}</span>`
          : "",
        l.email
          ? `${de ? "E-Mail" : "Email"}: <a href="mailto:${escapeHtml(l.email)}">${escapeHtml(l.email)}</a>`
          : "",
        l.phone ? `${de ? "Tel" : "Phone"}: ${escapeHtml(l.phone)}` : "",
        l.address ? escapeHtml(l.address) : "",
        l.source_url
          ? `<a href="${escapeHtml(l.source_url)}" style="color:#0b57d0">${de ? "Inserat öffnen" : "Open listing"}</a>`
          : "",
        l.snippet
          ? `<span style="color:#555">${escapeHtml(l.snippet.replace(/\s+/g, " ").trim().slice(0, 220))}</span>`
          : "",
      ].filter(Boolean);
      return `<li style="margin:0 0 16px;padding:12px 14px;border:1px solid #e8e8e8;border-radius:12px;list-style:none">${bits.join("<br/>")}</li>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.45;color:#111;max-width:640px">
<p>${escapeHtml(hi)}</p>
<p>${
    n > 0
      ? de
        ? `Hier ist dein <strong>${when}-Digest</strong> für <strong>${escapeHtml(opts.companyName)}</strong>: <strong>${n}</strong> ${noun} von den AT-Portalen.`
        : `Here is your <strong>${when} digest</strong> for <strong>${escapeHtml(opts.companyName)}</strong>: <strong>${n}</strong> ${noun} from the AT portals.`
      : de
        ? `Dein <strong>${when}-Digest</strong> für <strong>${escapeHtml(opts.companyName)}</strong> — keine neuen seit dem letzten Versand.`
        : `Your <strong>${when} digest</strong> for <strong>${escapeHtml(opts.companyName)}</strong> — no new leads since last send.`
  }</p>
${block.length ? `<ol style="padding:0;margin:0">${htmlItems}</ol>` : `<p>${de ? "Noch keine Leads." : "No leads yet."}</p>`}
<p><a href="${SITE_URL}/akquise">${de ? "Alle Leads in der Console öffnen" : "Open all leads in the console"}</a></p>
<p style="color:#666;font-size:13px">— Aura OS · ${de ? "Immobilien-Desk" : "Realty desk"}</p>
</body></html>`;

  return { subject, text, html };
}
