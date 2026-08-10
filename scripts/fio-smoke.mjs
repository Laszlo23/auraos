#!/usr/bin/env node
/**
 * FIO chain smoke — no secrets required.
 * Usage: node scripts/fio-smoke.mjs
 */
const ENDPOINTS = [
  process.env.FIO_API_URL,
  "https://fio.blockpane.com",
  "https://fio.eosusa.io",
  "https://fio.greymass.com",
].filter(Boolean);

const HANDLE = process.env.FIO_SMOKE_HANDLE || "vitalik@safu";
const PAIRS = [
  ["ETH", "ETH"],
  ["ETH", "USDC"],
  ["BASE", "ETH"],
  ["BASE", "USDC"],
];

async function post(base, path, body) {
  const res = await fetch(`${base}/v1/chain/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${base} ${path} HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`FIO smoke · handle=${HANDLE}`);
  let okHost = null;
  for (const base of ENDPOINTS) {
    try {
      const avail = await post(base, "avail_check", { fio_name: HANDLE });
      console.log(`  avail_check @ ${base}: is_registered=${avail.is_registered}`);
      if (avail.is_registered === 1) {
        okHost = base;
        break;
      }
    } catch (e) {
      console.log(`  FAIL ${base}: ${e.message}`);
    }
  }
  if (!okHost) {
    console.error("No healthy FIO endpoint / handle not registered.");
    process.exit(1);
  }

  let mapped = 0;
  for (const [chain, token] of PAIRS) {
    try {
      const r = await post(okHost, "get_pub_address", {
        fio_address: HANDLE,
        chain_code: chain,
        token_code: token,
      });
      const addr = r.public_address || null;
      console.log(`  ${chain}/${token}: ${addr ? addr.slice(0, 12) + "…" : "(none)"}`);
      if (addr) mapped += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/HTTP 404/.test(msg)) {
        console.log(`  ${chain}/${token}: (none)`);
      } else {
        console.log(`  ${chain}/${token}: FAIL ${msg}`);
      }
    }
  }

  console.log(`\nHost ${okHost} · mapped pairs ${mapped}/${PAIRS.length}`);
  if (mapped < 1) process.exit(1);
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
