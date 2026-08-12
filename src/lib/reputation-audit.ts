/** Heuristic reputation audit — no Places API required. */

export type ReputationAuditInput = {
  businessName: string;
  city: string;
  googleUrl?: string;
  websiteUrl?: string;
  niche?: string;
  email?: string;
};

export type ReputationFinding = {
  id: string;
  ok: boolean;
  title: string;
  detail: string;
};

export type ReputationAuditResult = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  findings: ReputationFinding[];
  recommendations: string[];
};

function looksLikeGoogleReviewUrl(raw: string): boolean {
  const u = raw.trim().toLowerCase();
  if (!u) return false;
  return (
    u.includes("g.page") ||
    u.includes("google.com/maps") ||
    u.includes("maps.app.goo.gl") ||
    u.includes("goo.gl/maps") ||
    (u.includes("google.") && u.includes("place"))
  );
}

function looksLikeWebsite(raw: string): boolean {
  const u = raw.trim().toLowerCase();
  if (!u) return false;
  try {
    const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
    return Boolean(parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function scoreReputationAudit(input: ReputationAuditInput): ReputationAuditResult {
  const name = input.businessName.trim();
  const city = input.city.trim();
  const google = (input.googleUrl || "").trim();
  const website = (input.websiteUrl || "").trim();
  const niche = (input.niche || "").trim();

  const findings: ReputationFinding[] = [];
  let score = 0;

  const hasName = name.length >= 2;
  findings.push({
    id: "name",
    ok: hasName,
    title: hasName ? "Betriebsname klar" : "Betriebsname fehlt",
    detail: hasName
      ? "Wir können den Betrieb zuordnen."
      : "Ohne Namen keine gezielte Nachbetreuung.",
  });
  if (hasName) score += 15;

  const hasCity = city.length >= 2;
  findings.push({
    id: "city",
    ok: hasCity,
    title: hasCity ? "Stadt hinterlegt" : "Stadt fehlt",
    detail: hasCity ? "Lokal sichtbar in deiner Region." : "Stadt hilft bei lokalen Empfehlungen.",
  });
  if (hasCity) score += 10;

  const hasNiche = niche.length >= 2;
  findings.push({
    id: "niche",
    ok: hasNiche,
    title: hasNiche ? "Branche gewählt" : "Branche offen",
    detail: hasNiche
      ? "Passende Texte für deine Branche möglich."
      : "Branche macht Follow-ups relevanter.",
  });
  if (hasNiche) score += 10;

  const hasGoogle = google.length > 0;
  const googleOk = hasGoogle && looksLikeGoogleReviewUrl(google);
  findings.push({
    id: "google",
    ok: googleOk,
    title: googleOk
      ? "Google-Bewertungslink erkannt"
      : hasGoogle
        ? "Link sieht nicht nach Google Review aus"
        : "Google-Bewertungslink fehlt",
    detail: googleOk
      ? "Kunden können direkt bewerten."
      : "Ohne g.page / Maps-Link keine systematischen Sterne-Anfragen.",
  });
  if (googleOk) score += 35;
  else if (hasGoogle) score += 10;

  const websiteOk = website.length > 0 && looksLikeWebsite(website);
  findings.push({
    id: "website",
    ok: websiteOk,
    title: websiteOk ? "Website vorhanden" : "Website fehlt / unklar",
    detail: websiteOk
      ? "Gute Basis für Vertrauen und Follow-up."
      : "Optional — stärkt Glaubwürdigkeit, ist aber nicht Pflicht.",
  });
  if (websiteOk) score += 15;

  // Baseline: no systematic follow-up / check-in yet (always recommend until product active)
  findings.push({
    id: "followup",
    ok: false,
    title: "Kein systematischer Follow-up",
    detail:
      "Die meisten Betriebe fragen Bewertungen nur sporadisch — Aura macht das wiederkehrend.",
  });
  findings.push({
    id: "checkin",
    ok: false,
    title: "Kein Gäste-Check-in",
    detail: "Stammgäste können im Laden einchecken — Feedback ohne Fake-Sterne-Druck.",
  });

  score = Math.max(0, Math.min(100, score));
  const grade: ReputationAuditResult["grade"] =
    score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

  const recommendations: string[] = [];
  if (!googleOk) {
    recommendations.push("Google-Bewertungslink hinterlegen (g.page oder Maps).");
  }
  recommendations.push(
    "Echte Kunden nach dem Besuch systematisch um Feedback bitten — ohne Fake-Sterne.",
  );
  recommendations.push("Check-in für Stammgäste einführen, damit Nachbetreuung messbar wird.");
  if (!websiteOk) {
    recommendations.push("Optional: klare Website oder Profilseite für Vertrauen.");
  }

  return {
    score,
    grade,
    findings,
    recommendations: recommendations.slice(0, 3),
  };
}
