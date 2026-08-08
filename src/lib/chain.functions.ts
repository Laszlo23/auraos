import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { alchemyHead, sha256Hex, type AnchorResult } from "./chain.server";
import { activeNetwork } from "./chain-config";

export const anchorGrant = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ ref: z.string(), amount: z.number(), reason: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<AnchorResult> => {
    const apiKey = process.env["ALCHEMY_API_KEY"];
    const network = activeNetwork();
    const block = apiKey ? await alchemyHead(apiKey, network) : null;
    const txHash = await sha256Hex(
      `${network}:${block ?? "dev"}:${data.ref}:${data.amount}:${data.reason}`,
    );
    return {
      network,
      status: block === null ? "dev" : "anchored",
      block,
      txHash: `0x${txHash}`,
    };
  });
