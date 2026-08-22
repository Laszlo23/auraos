import "./lib/error-capture";

import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

/**
 * Custom Nitro/SSR entry. Must use createServerEntry + createStartHandler directly.
 * Do NOT re-import `@tanstack/react-start/server-entry`'s default handler — Nitro also
 * registers this module as H3 middleware, and a nested dynamic import was producing
 * `handleServerAction({ request: undefined })` → full-page error HTML on serverFns
 * (e.g. ETH→USDC / trading desk).
 */
const startHandler = createStartHandler(defaultStreamHandler);

/**
 * Public marketing pages that can be cached for a short time.
 * Auth'd routes (/command, /wallet, etc.) are excluded.
 */
const PUBLIC_MARKETING_ROUTES = [
  "/",
  "/lokal",
  "/for/local",
  "/access",
  "/try",
  "/pricing",
  "/wien",
  "/tokenomics",
  "/whitepaper",
  "/how-it-works",
  "/proof",
  "/nachbar",
  "/team",
  "/pitch",
  "/blog",
];

function isPublicMarketingPage(pathname: string): boolean {
  return PUBLIC_MARKETING_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isWebRequest(value: unknown): value is Request {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Request).method === "string" &&
    typeof (value as Request).url === "string"
  );
}

/** h3 swallows some throws into `{"unhandled":true,"message":"HTTPError"}` JSON 500s. */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Add short Cache-Control for public marketing pages to reduce SSR load.
 * Authenticated routes and server functions are never cached.
 */
function addCacheHeaders(response: Response, request: Request): Response {
  const url = new URL(request.url);
  const isServerFn = request.headers.get("x-tsr-serverFn") === "true";
  const isHtml = response.headers.get("content-type")?.includes("text/html");

  if (isServerFn || !isHtml || response.status !== 200) {
    return response;
  }

  if (isPublicMarketingPage(url.pathname)) {
    const headers = new Headers(response.headers);
    // 2 minutes browser cache, 5 minutes CDN/proxy cache
    headers.set("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=60");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}

export default createServerEntry({
  async fetch(request) {
    // Nitro may invoke this export as middleware with a missing/invalid req.
    // Return 404 so multiHandler falls through to the vite SSR service with a real Request.
    if (!isWebRequest(request)) {
      return new Response(null, { status: 404 });
    }

    try {
      const response = await startHandler(request);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return addCacheHeaders(normalized, request);
    } catch (error) {
      console.error(error);
      // Never replace serverFn JSON with a navigable HTML error page.
      if (request.headers.get("x-tsr-serverFn") === "true") {
        throw error;
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
});
