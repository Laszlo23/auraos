// Server-only FIO Protocol chain lookups.
const FIO_ENDPOINTS = [
  process.env["FIO_API_URL"]?.trim(),
  "https://fio.blockpane.com",
  "https://fio.eosusa.io",
  "https://fio.greymass.com",
].filter((u): u is string => Boolean(u));

export type FioLookup = {
  fioHandle: string;
  chainCode: string;
  tokenCode: string;
  registered: boolean;
  publicAddress: string | null;
  endpoint?: string;
};

async function fioPost<T extends Record<string, unknown>>(
  path: string,
  body: unknown,
): Promise<{ data: T; endpoint: string } | null> {
  for (const base of FIO_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/v1/chain/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.status === 404) {
        // Unmapped address — not an endpoint failure.
        return { data: {} as T, endpoint: base };
      }
      if (!res.ok) continue;
      const json = (await res.json()) as T;
      // FIO error payloads often include `code` / `message` without HTTP failure.
      if (typeof json["code"] === "number" && json["code"] >= 400) continue;
      return { data: json, endpoint: base };
    } catch {
      continue;
    }
  }
  return null;
}

export function normaliseFioHandle(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidFioHandle(handle: string) {
  return /^[a-z0-9-]{1,62}@[a-z0-9-]{1,62}$/.test(handle);
}

/** Resolves a FIO crypto handle to its mapped public address for a chain/token pair. */
export async function lookupFioHandle(input: {
  fioHandle: string;
  chainCode: string;
  tokenCode: string;
}): Promise<FioLookup> {
  const fioHandle = normaliseFioHandle(input.fioHandle);
  const avail = await fioPost<{ is_registered?: number }>("avail_check", { fio_name: fioHandle });
  if (!avail) {
    throw new Error("FIO chain unreachable — try again in a moment.");
  }
  const registered = avail.data.is_registered === 1;

  let publicAddress: string | null = null;
  let endpoint = avail.endpoint;
  if (registered) {
    const mapped = await fioPost<{ public_address?: string; message?: string }>("get_pub_address", {
      fio_address: fioHandle,
      chain_code: input.chainCode,
      token_code: input.tokenCode,
    });
    publicAddress = mapped?.data.public_address ?? null;
    if (mapped) endpoint = mapped.endpoint;
  }

  return {
    fioHandle,
    chainCode: input.chainCode,
    tokenCode: input.tokenCode,
    registered,
    publicAddress,
    endpoint,
  };
}

/** Try several chain/token pairs until one maps (useful when founders map Base USDC only). */
export async function lookupFioHandleAny(
  fioHandle: string,
  pairs: { chainCode: string; tokenCode: string }[],
): Promise<FioLookup> {
  let last: FioLookup | null = null;
  for (const pair of pairs) {
    const lookup = await lookupFioHandle({ fioHandle, ...pair });
    last = lookup;
    if (lookup.registered && lookup.publicAddress) return lookup;
    if (!lookup.registered) return lookup;
  }
  return (
    last ?? {
      fioHandle: normaliseFioHandle(fioHandle),
      chainCode: pairs[0]?.chainCode ?? "ETH",
      tokenCode: pairs[0]?.tokenCode ?? "ETH",
      registered: false,
      publicAddress: null,
    }
  );
}
