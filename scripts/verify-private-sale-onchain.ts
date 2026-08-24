import { createPublicClient, formatUnits, http } from "viem";
import { base } from "viem/chains";

import { alchemyRpcUrl } from "../src/lib/chain-config";
import {
  PRIVATE_SALE_ABI,
  PRIVATE_SALE_CONTRACT_LIVE,
  PRIVATE_SALE_TREASURY,
} from "../src/lib/private-sale";

async function main() {
  const address = PRIVATE_SALE_CONTRACT_LIVE;
  const client = createPublicClient({
    chain: base,
    transport: http(alchemyRpcUrl({ network: "base" }) || "https://mainnet.base.org"),
  });
  const code = await client.getBytecode({ address });
  const name = await client.readContract({
    address,
    abi: [{ type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
    functionName: "name",
  });
  const symbol = await client.readContract({
    address,
    abi: [{ type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
    functionName: "symbol",
  });
  const treasury = await client.readContract({
    address,
    abi: PRIVATE_SALE_ABI,
    functionName: "TREASURY",
  });
  const cap = await client.readContract({
    address,
    abi: PRIVATE_SALE_ABI,
    functionName: "SALE_CAP",
  });
  const rem = await client.readContract({
    address,
    abi: PRIVATE_SALE_ABI,
    functionName: "remaining",
  });
  const raised = await client.readContract({
    address,
    abi: PRIVATE_SALE_ABI,
    functionName: "usdcRaised",
  });
  const preview = await client.readContract({
    address,
    abi: PRIVATE_SALE_ABI,
    functionName: "previewBuy",
    args: [50_000_000n],
  });
  process.stdout.write(
    JSON.stringify(
      {
        address,
        codeBytes: (code?.length ?? 2) / 2 - 1,
        name,
        symbol,
        treasury,
        treasuryMatch: treasury.toLowerCase() === PRIVATE_SALE_TREASURY.toLowerCase(),
        cap: formatUnits(cap, 18),
        remaining: formatUnits(rem, 18),
        usdcRaised: Number(raised) / 1e6,
        preview50: formatUnits(preview, 18),
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
