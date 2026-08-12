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

export default createServerEntry({
  async fetch(request) {
    // Nitro may invoke this export as middleware with a missing/invalid req.
    // Return 404 so multiHandler falls through to the vite SSR service with a real Request.
    if (!isWebRequest(request)) {
      return new Response(null, { status: 404 });
    }

    try {
      const response = await startHandler(request);
      return await normalizeCatastrophicSsrResponse(response);
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
