// Server-only FIO Protocol chain lookups.
const FIO_ENDPOINTS = [
  "https://fio.blockpane.com",
  "https://fio.eosusa.io",
  "https://fio.greymass.com",
];

export type FioLookup = {
  fioHandle: string;
  chainCode: string;
  tokenCode: string;
  registered: boolean;
  publicAddress: string | null;
};

async function fioPost<T>(path: string, body: unknown): Promise<T | null> {
  for (const base of FIO_ENDPOINTS) {
    try {
      const res = await fetch(`${base}/v1/chain/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as T;
      return json;
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
  const registered = avail?.is_registered === 1;

  let publicAddress: string | null = null;
  if (registered) {
    const mapped = await fioPost<{ public_address?: string; message?: string }>("get_pub_address", {
      fio_address: fioHandle,
      chain_code: input.chainCode,
      token_code: input.tokenCode,
    });
    publicAddress = mapped?.public_address ?? null;
  }

  return {
    fioHandle,
    chainCode: input.chainCode,
    tokenCode: input.tokenCode,
    registered,
    publicAddress,
  };
}
