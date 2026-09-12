/**
 * One-shot ops: send spendable ETH from Aura Light Account on Base.
 * Bumps fees so a stuck "replacement underpriced" UserOp can be replaced.
 *
 *   npx tsx scripts/ops-send-smart-eth.ts --address 0xF1fc… --to 0x7894…
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { concatHex, formatEther, type Address, type Hex } from "viem";

import {
  alchemyRpcUrl,
  gasSponsorshipEnabled,
  nativeGasBufferWei,
} from "../src/lib/chain-config";
import { baseBuilderDataSuffix } from "../src/lib/base-builder";
import {
  createSponsoredLightClient,
  decryptOwnerKey,
  type LightClient,
} from "../src/lib/wallet.server";
import { AURA_LAUNCH_TREASURY } from "../src/lib/aura-token";

function loadDotEnv(path = ".env") {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const key = t.slice(0, i).trim();
      let value = t.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* env may already be injected */
  }
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

async function nativeBal(rpc: string, address: string): Promise<bigint> {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string };
  return json.result ? BigInt(json.result) : 0n;
}

async function main() {
  loadDotEnv();
  const walletAddress = (
    arg("--address") || "0xF1fcB0c5a9F23CCaB3a16620073f7B26A18f8873"
  ).trim();
  const toRaw = (arg("--to") || AURA_LAUNCH_TREASURY).trim();
  const feeMult = Number(arg("--fee-mult") || "4");
  const feeGwei = arg("--fee-gwei");
  const priorityGwei = arg("--priority-gwei");
  const bufferEth = arg("--buffer-eth");
  const waitMs = Number(arg("--wait-ms") || "120000");
  const noBuilder = process.argv.includes("--no-builder");
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) throw new Error("Invalid --address");
  if (!/^0x[a-fA-F0-9]{40}$/.test(toRaw)) throw new Error("Invalid --to address");
  const to = toRaw.toLowerCase() as Address;
  const network = "base" as const;

  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const service = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !service) throw new Error("Supabase admin env missing");
  if (!process.env["APP_USER_CONNECTION_KEY_SECRET"]) {
    throw new Error("APP_USER_CONNECTION_KEY_SECRET missing");
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: wallet, error: wErr } = await admin
    .from("wallet_bindings")
    .select("address, owner_key_enc, kind, chain, deployed, user_id")
    .ilike("address", walletAddress)
    .eq("kind", "smart")
    .maybeSingle();
  if (wErr) throw wErr;
  if (!wallet?.address || !wallet.owner_key_enc) {
    throw new Error("No smart wallet binding with encrypted owner key for that address");
  }

  const from = String(wallet.address);
  if (from.toLowerCase() === to) throw new Error("Cannot send to self");

  const rpc = alchemyRpcUrl({ network });
  if (!rpc) throw new Error("Alchemy Base RPC missing");

  const bal = await nativeBal(rpc, from);
  const sponsored = gasSponsorshipEnabled(network);
  const defaultBuffer = nativeGasBufferWei(network, sponsored);
  const buffer = bufferEth
    ? BigInt(Math.round(Number(bufferEth) * 1e18))
    : defaultBuffer;
  const spendable = bal > buffer ? bal - buffer : 0n;

  const overrides =
    feeGwei != null
      ? {
          maxFeePerGas: BigInt(Math.round(Number(feeGwei) * 1e9)),
          maxPriorityFeePerGas: BigInt(
            Math.round(Number(priorityGwei ?? feeGwei) * 1e9),
          ),
        }
      : {
          maxFeePerGas: { multiplier: feeMult },
          maxPriorityFeePerGas: { multiplier: feeMult },
        };

  console.log(
    JSON.stringify(
      {
        from,
        to,
        network,
        bindingChain: wallet.chain,
        deployedFlag: wallet.deployed,
        balanceEth: formatEther(bal),
        bufferEth: formatEther(buffer),
        spendableEth: formatEther(spendable),
        sponsored,
        feeMult,
        feeGwei,
        priorityGwei,
        overrides:
          feeGwei != null
            ? {
                maxFeePerGas: String((overrides as { maxFeePerGas: bigint }).maxFeePerGas),
                maxPriorityFeePerGas: String(
                  (overrides as { maxPriorityFeePerGas: bigint }).maxPriorityFeePerGas,
                ),
              }
            : overrides,
      },
      null,
      2,
    ),
  );

  if (spendable <= 0n) throw new Error("Nothing spendable after gas buffer");

  const pk = decryptOwnerKey(wallet.owner_key_enc);
  const client = await createSponsoredLightClient(pk, network);
  const uo = {
    target: to,
    data: "0x" as Hex,
    value: spendable,
  };

  const suffix = noBuilder ? null : baseBuilderDataSuffix(network);
  let hash: string;
  if (!suffix) {
    console.log(JSON.stringify({ path: "sendUserOperation", noBuilder }, null, 2));
    const result = await (client as any).sendUserOperation({ uo, overrides });
    hash = typeof result === "string" ? result : String(result.hash ?? result);
  } else {
    console.log(JSON.stringify({ path: "sendRawUserOperation+builder" }, null, 2));
    const uoStruct = await (client as any).buildUserOperation({ uo, overrides });
    console.log(
      JSON.stringify(
        {
          built: {
            nonce: String(uoStruct.nonce),
            maxFeePerGas: String(uoStruct.maxFeePerGas),
            maxPriorityFeePerGas: String(uoStruct.maxPriorityFeePerGas),
            callGasLimit: String(uoStruct.callGasLimit),
            verificationGasLimit: String(uoStruct.verificationGasLimit),
            preVerificationGas: String(uoStruct.preVerificationGas),
            paymasterAndData: uoStruct.paymasterAndData ?? uoStruct.paymaster,
          },
        },
        null,
        2,
      ),
    );
    const callData = uoStruct.callData as Hex | undefined;
    if (typeof callData === "string" && callData.startsWith("0x")) {
      uoStruct.callData = concatHex([callData, suffix]);
    }
    const request = await (client as any).signUserOperation({ uoStruct });
    const entryPoint = (client as any).account.getEntryPoint();
    hash = String(
      await (
        client as LightClient & {
          sendRawUserOperation: (req: unknown, entryPointAddress: Address) => Promise<Hex>;
        }
      ).sendRawUserOperation(request, entryPoint.address),
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        userOpHash: hash,
        address: (client as any).account.address,
        sentEth: formatEther(spendable),
        explorerUserOp: `https://basescan.org/tx/${hash}`,
      },
      null,
      2,
    ),
  );

  if (waitMs > 0) {
    try {
      const txHash = await (client as any).waitForUserOperationTransaction({
        hash,
        retries: {
          multiplier: 1.2,
          intervalMs: 2000,
          maxDurationMs: waitMs,
        },
      });
      console.log(JSON.stringify({ mined: true, transactionHash: txHash }, null, 2));
    } catch (err) {
      console.error(
        JSON.stringify(
          {
            mined: false,
            userOpHash: hash,
            waitError: err instanceof Error ? err.message : String(err),
          },
          null,
          2,
        ),
      );
      process.exit(2);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
