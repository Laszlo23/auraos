import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonResponse, withPayment } from "@/lib/x402-gateway";
import { genesisPriceUsdc } from "@/lib/genesis.server";

export const Route = createFileRoute("/api/public/x402/genesis-passport")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async () =>
        jsonResponse(
          {
            error: "use POST",
            input: { company_id: "<uuid>" },
            price_usdc: genesisPriceUsdc(),
            note: "After settle, open Wallet → Confirm x402 payment → Claim mint. Utility NFT only.",
          },
          { status: 405 },
        ),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { company_id?: unknown };
        const companyId =
          typeof body.company_id === "string" ? body.company_id.trim().slice(0, 64) : "";
        if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
          return jsonResponse({ error: "invalid_company_id" }, { status: 400 });
        }
        return withPayment("genesis-passport", request, async () => ({
          ok: true,
          company_id: companyId,
          entitlement: "genesis_passport",
          next: "Call markGenesisPaidFromX402 from the Wallet page, then claimGenesisNft.",
          honesty: "Utility membership passport — not an investment; not token launch.",
        }));
      },
    },
  },
});
