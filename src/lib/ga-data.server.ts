import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";

export type Ga4Report = {
  configured: boolean;
  error?: string;
  sessions?: number;
  pageViews?: number;
  topPaths?: Array<{ path: string; views: number }>;
};

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
};

function loadServiceAccount(): ServiceAccount | null {
  const raw = (process.env["GA4_SERVICE_ACCOUNT_JSON"] || "").trim();
  if (!raw) return null;
  try {
    if (raw.startsWith("{")) return JSON.parse(raw) as ServiceAccount;
    if (raw.startsWith("/")) return JSON.parse(readFileSync(raw, "utf8")) as ServiceAccount;
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

function propertyId(): string | null {
  const raw = (process.env["GA4_PROPERTY_ID"] || "").trim();
  if (!raw) return null;
  return raw.replace(/^properties\//, "");
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signJwt(email: string, pem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const sig = sign.sign(createPrivateKey(pem)).toString("base64url");
  return `${unsigned}.${sig}`;
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (!sa.client_email || !sa.private_key) {
    throw new Error("GA service account JSON is missing client_email or private_key");
  }
  const jwt = signJwt(sa.client_email, sa.private_key);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || `Google token HTTP ${res.status}`);
  }
  return json.access_token;
}

function dim(row: { dimensionValues?: Array<{ value?: string }> }, i: number): string {
  return row.dimensionValues?.[i]?.value || "(not set)";
}

function metric(row: { metricValues?: Array<{ value?: string }> }, i: number): number {
  return Number(row.metricValues?.[i]?.value || 0);
}

export async function fetchGa4Traffic(days = 14): Promise<Ga4Report> {
  const id = propertyId();
  const sa = loadServiceAccount();
  if (!id || !sa) {
    return { configured: false };
  }
  try {
    const token = await accessToken(sa);
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
        limit: 25,
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      }),
    });
    const json = (await res.json()) as {
      error?: { message?: string };
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };
    if (!res.ok) {
      return { configured: true, error: json.error?.message || `GA4 HTTP ${res.status}` };
    }
    const rows = json.rows ?? [];
    const topPaths = rows.map((row) => ({ path: dim(row, 0), views: metric(row, 0) }));
    const pageViews = topPaths.reduce((n, r) => n + r.views, 0);
    const sessions = rows.reduce((n, row) => n + metric(row, 1), 0);
    return { configured: true, sessions, pageViews, topPaths };
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : "GA4 request failed" };
  }
}
