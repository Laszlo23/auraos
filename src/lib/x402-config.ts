/**
 * Shared x402 payTo resolution.
 * Prefer explicit X402_PAY_TO; fall back to OKX_PAYOUT_ADDRESS (platform treasury).
 */
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

let warnedFallback = false;

export function isProdRuntime(): boolean {
  return process.env["NODE_ENV"] === "production" || process.env["VITE_APP_ENV"] === "production";
}

function normalizeAddress(raw: string | undefined | null): `0x${string}` | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!ADDR_RE.test(v)) return null;
  return v as `0x${string}`;
}

/** Platform USDC receiver for x402. Null when neither env is a valid address. */
export function resolveX402PayTo(): `0x${string}` | null {
  const explicit = normalizeAddress(process.env["X402_PAY_TO"]);
  if (explicit) return explicit;

  const fallback = normalizeAddress(process.env["OKX_PAYOUT_ADDRESS"]);
  if (fallback) {
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(
        "[x402] X402_PAY_TO unset — falling back to OKX_PAYOUT_ADDRESS (platform treasury). Set X402_PAY_TO explicitly in production.",
      );
    }
    return fallback;
  }
  return null;
}

/** Throws in production when no payTo is configured. */
export function assertX402ConfiguredForProd(): void {
  if (!isProdRuntime()) return;
  if (resolveX402PayTo()) return;
  throw new Error("x402 is misconfigured: set X402_PAY_TO (or OKX_PAYOUT_ADDRESS) for production.");
}
