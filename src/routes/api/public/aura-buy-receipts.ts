import { createFileRoute } from "@tanstack/react-router";

import { listAuraBuyPublicReceipts } from "@/lib/aura-buy.functions";

export const Route = createFileRoute("/api/public/aura-buy-receipts")({
  server: {
    handlers: {
      GET: async () => {
        const receipts = await listAuraBuyPublicReceipts(40);
        return Response.json(
          { receipts },
          {
            headers: {
              "Cache-Control": "public, max-age=30, s-maxage=60",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
