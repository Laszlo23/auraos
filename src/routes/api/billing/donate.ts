import { createFileRoute } from "@tanstack/react-router";

import {
  createDonationInvoice,
  nowPaymentsConfigured,
  parseDonateAmountUsd,
} from "@/lib/nowpayments-donate";
import { clientIpFromRequest, rateLimitConsume } from "@/lib/rate-limit.server";

/**
 * Public crypto donation checkout (NOWPayments invoice).
 * POST { amount_usd: 5 | 10 | 25 | 50 | 100 | 250 } → { url, order_id, amount_usd }
 */
export const Route = createFileRoute("/api/billing/donate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = clientIpFromRequest(request);
        const limited = rateLimitConsume(`donate:${ip}`, {
          limit: 10,
          windowMs: 60 * 60 * 1000,
        });
        if (!limited.ok) {
          return Response.json(
            { error: "Too many donation attempts — try again later." },
            {
              status: 429,
              headers: { "Retry-After": String(limited.retryAfterSec) },
            },
          );
        }

        if (!nowPaymentsConfigured()) {
          return Response.json(
            {
              error:
                "Crypto donations are not configured yet (NOWPAYMENTS_API_KEY). Try again later.",
            },
            { status: 503 },
          );
        }

        const body = (await request.json().catch(() => ({}))) as { amount_usd?: unknown };
        const amountUsd = parseDonateAmountUsd(body.amount_usd);
        if (amountUsd == null) {
          return Response.json(
            { error: "amount_usd must be one of 5, 10, 25, 50, 100, 250" },
            { status: 400 },
          );
        }

        try {
          const invoice = await createDonationInvoice({ amountUsd });
          const url = invoice.invoice_url;
          if (!url) {
            return Response.json({ error: "Invoice URL missing" }, { status: 502 });
          }
          return Response.json({
            url,
            order_id: invoice.order_id,
            amount_usd: amountUsd,
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Donation checkout failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});
