import { SITE_URL } from "@/lib/site";

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
};

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
  return (l.name || l.org || "Lead").trim();
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
  const when =
    opts.slotHour < 12
      ? de
        ? "Morgen"
        : "morning"
      : de
        ? "Nachmittag"
        : "afternoon";
  const n = opts.newLeads.length;
  const subject =
    n > 0
      ? de
        ? `${opts.companyName} · ${n} neue Lead${n === 1 ? "" : "s"} (${when})`
        : `${opts.companyName} · ${n} new lead${n === 1 ? "" : "s"} (${when})`
      : de
        ? `${opts.companyName} · Lead-Update (${when}) — keine neuen seit dem letzten Versand`
        : `${opts.companyName} · Lead update (${when}) — no new leads since last send`;

  const lines: string[] = [];
  if (de) {
    lines.push(`Hallo,`);
    lines.push(``);
    lines.push(
      n > 0
        ? `hier ist dein ${when}-Digest für ${opts.companyName}: ${n} neue Lead${n === 1 ? "" : "s"} seit dem letzten Versand.`
        : `hier ist dein ${when}-Digest für ${opts.companyName}. Seit dem letzten Versand sind keine neuen Leads dazugekommen — unten die letzten Einträge zur Übersicht.`,
    );
  } else {
    lines.push(`Hi,`);
    lines.push(``);
    lines.push(
      n > 0
        ? `here is your ${when} digest for ${opts.companyName}: ${n} new lead${n === 1 ? "" : "s"} since the last send.`
        : `here is your ${when} digest for ${opts.companyName}. No new leads since the last send — recent ones below for context.`,
    );
  }
  lines.push(``);

  const block = opts.newLeads.length > 0 ? opts.newLeads : opts.recentLeads.slice(0, 8);
  if (block.length === 0) {
    lines.push(de ? "Noch keine Leads in der Akte." : "No leads on file yet.");
  } else {
    block.forEach((l, i) => {
      lines.push(`${i + 1}. ${leadTitle(l)}${l.org && l.name ? ` · ${l.org}` : ""}`);
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
  lines.push(de ? `— Aura OS · Lead hunter` : `— Aura OS · Lead hunter`);

  const text = lines.join("\n");

  const htmlItems = block
    .map((l) => {
      const bits = [
        `<strong>${escapeHtml(leadTitle(l))}</strong>`,
        l.org && l.name ? escapeHtml(l.org) : "",
        l.email
          ? `${de ? "E-Mail" : "Email"}: <a href="mailto:${escapeHtml(l.email)}">${escapeHtml(l.email)}</a>`
          : "",
        l.phone ? `${de ? "Tel" : "Phone"}: ${escapeHtml(l.phone)}` : "",
        l.address ? escapeHtml(l.address) : "",
        l.source_url
          ? `<a href="${escapeHtml(l.source_url)}">${escapeHtml(l.source_url)}</a>`
          : "",
        l.snippet
          ? `<span style="color:#555">${escapeHtml(l.snippet.replace(/\s+/g, " ").trim().slice(0, 220))}</span>`
          : "",
      ].filter(Boolean);
      return `<li style="margin:0 0 14px">${bits.join("<br/>")}</li>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.45;color:#111">
<p>${de ? "Hallo," : "Hi,"}</p>
<p>${
    n > 0
      ? de
        ? `Hier ist dein <strong>${when}-Digest</strong> für <strong>${escapeHtml(opts.companyName)}</strong>: <strong>${n}</strong> neue Lead${n === 1 ? "" : "s"}.`
        : `Here is your <strong>${when} digest</strong> for <strong>${escapeHtml(opts.companyName)}</strong>: <strong>${n}</strong> new lead${n === 1 ? "" : "s"}.`
      : de
        ? `Dein <strong>${when}-Digest</strong> für <strong>${escapeHtml(opts.companyName)}</strong> — keine neuen seit dem letzten Versand.`
        : `Your <strong>${when} digest</strong> for <strong>${escapeHtml(opts.companyName)}</strong> — no new leads since last send.`
  }</p>
${block.length ? `<ol style="padding-left:1.2rem">${htmlItems}</ol>` : `<p>${de ? "Noch keine Leads." : "No leads yet."}</p>`}
<p><a href="${SITE_URL}/akquise">${de ? "Alle Leads in der Console öffnen" : "Open all leads in the console"}</a></p>
<p style="color:#666;font-size:13px">— Aura OS · Lead hunter</p>
</body></html>`;

  return { subject, text, html };
}
