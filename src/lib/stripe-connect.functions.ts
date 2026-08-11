import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LooseDb = {
  from: (table: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { email?: string | null } | null } }> };
};
function asDb(client: unknown): LooseDb {
  return client as LooseDb;
}

async function ownedCompany(supabase: LooseDb, userId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) throw new Error("Company not found — finish onboarding first.");
  return data as { id: string; name: string };
}

export const getStripeConnectStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("company_stripe_accounts")
      .select(
        "stripe_account_id, charges_ready, payouts_ready, details_submitted, requirements_due",
      )
      .eq("company_id", company.id)
      .maybeSingle();

    if (!row) {
      return {
        connected: false,
        stripeAccountId: null,
        chargesReady: false,
        payoutsReady: false,
        detailsSubmitted: false,
        requirementsDue: [] as string[],
        dashboardUrl: null as string | null,
      };
    }

    return {
      connected: true,
      stripeAccountId: row.stripe_account_id,
      chargesReady: Boolean(row.charges_ready),
      payoutsReady: Boolean(row.payouts_ready),
      detailsSubmitted: Boolean(row.details_submitted),
      requirementsDue: Array.isArray(row.requirements_due)
        ? (row.requirements_due as string[])
        : [],
      dashboardUrl: "https://dashboard.stripe.com",
    };
  });

export const startStripeConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        returnPath: z.string().optional(),
        refreshPath: z.string().optional(),
        country: z.string().length(2).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      createConnectAccountLink,
      createConnectMerchantAccount,
      formatConnectError,
      mapAccountToFlags,
      retrieveConnectAccount,
    } = await import("@/lib/stripe-connect.server");

    try {
      const { data: authUser } = await asDb(context.supabase).auth.getUser();
      const claimEmail =
        typeof (context as { claims?: { email?: string } }).claims?.email === "string"
          ? (context as { claims: { email?: string } }).claims.email
          : undefined;
      const email =
        authUser.user?.email?.trim() ||
        claimEmail?.trim() ||
        `${company.id.replace(/-/g, "").slice(0, 12)}@connect.aibusiness.fun`;

      let { data: row } = await supabaseAdmin
        .from("company_stripe_accounts")
        .select("stripe_account_id")
        .eq("company_id", company.id)
        .maybeSingle();

      if (!row?.stripe_account_id) {
        const created = await createConnectMerchantAccount({
          displayName: company.name || "Aura company",
          contactEmail: email,
          ...(data.country ? { country: data.country } : {}),
        });
        if (!created.id) throw new Error("Stripe did not return an account id.");
        const flags = mapAccountToFlags(created);
        const { error } = await supabaseAdmin.from("company_stripe_accounts").upsert(
          {
            company_id: company.id,
            stripe_account_id: created.id,
            country: (data.country ?? process.env["STRIPE_CONNECT_DEFAULT_COUNTRY"] ?? "AT")
              .toUpperCase()
              .slice(0, 2),
            dashboard: "full",
            charges_ready: flags.chargesReady,
            payouts_ready: flags.payoutsReady,
            details_submitted: flags.detailsSubmitted,
            requirements_due: flags.requirementsDue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" },
        );
        if (error) throw error;
        row = { stripe_account_id: created.id };
      } else {
        // Refresh flags opportunistically
        try {
          const live = await retrieveConnectAccount(row.stripe_account_id);
          const flags = mapAccountToFlags(live);
          await supabaseAdmin
            .from("company_stripe_accounts")
            .update({
              charges_ready: flags.chargesReady,
              payouts_ready: flags.payoutsReady,
              details_submitted: flags.detailsSubmitted,
              requirements_due: flags.requirementsDue,
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", company.id);
        } catch {
          /* continue to onboarding link */
        }
      }

      const url = await createConnectAccountLink({
        accountId: row.stripe_account_id,
        ...(data.returnPath ? { returnPath: data.returnPath } : {}),
        ...(data.refreshPath ? { refreshPath: data.refreshPath } : {}),
      });
      return { url };
    } catch (err) {
      throw formatConnectError(err, "Could not start Stripe Connect onboarding");
    }
  });

export const refreshStripeConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { mapAccountToFlags, retrieveConnectAccount } =
      await import("@/lib/stripe-connect.server");

    const { data: row } = await supabaseAdmin
      .from("company_stripe_accounts")
      .select("stripe_account_id")
      .eq("company_id", company.id)
      .maybeSingle();
    if (!row?.stripe_account_id) {
      return {
        connected: false,
        stripeAccountId: null,
        chargesReady: false,
        payoutsReady: false,
        detailsSubmitted: false,
        requirementsDue: [] as string[],
        dashboardUrl: null as string | null,
      };
    }

    const live = await retrieveConnectAccount(row.stripe_account_id);
    const flags = mapAccountToFlags(live);
    await supabaseAdmin
      .from("company_stripe_accounts")
      .update({
        charges_ready: flags.chargesReady,
        payouts_ready: flags.payoutsReady,
        details_submitted: flags.detailsSubmitted,
        requirements_due: flags.requirementsDue,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", company.id);

    return {
      connected: true,
      stripeAccountId: row.stripe_account_id,
      chargesReady: flags.chargesReady,
      payoutsReady: flags.payoutsReady,
      detailsSubmitted: flags.detailsSubmitted,
      requirementsDue: flags.requirementsDue,
      dashboardUrl: "https://dashboard.stripe.com",
    };
  });

export const createConnectedSitePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        siteId: z.string().uuid(),
        name: z.string().min(1).max(120),
        amountCents: z.number().int().min(50).max(10_000_000),
        currency: z.string().length(3).default("eur"),
        interval: z.enum(["one_time", "day", "week", "month", "year"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const company = await ownedCompany(asDb(context.supabase), context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPriceOnConnectedAccount } = await import("@/lib/stripe-connect.server");

    const { data: connect } = await supabaseAdmin
      .from("company_stripe_accounts")
      .select("stripe_account_id, charges_ready")
      .eq("company_id", company.id)
      .maybeSingle();
    if (!connect?.stripe_account_id) {
      throw new Error("Connect Stripe first — Billing → Sell with Stripe.");
    }
    if (!connect.charges_ready) {
      throw new Error("Finish Stripe onboarding before creating a sellable price.");
    }

    const { data: site } = await supabaseAdmin
      .from("company_sites")
      .select("id")
      .eq("id", data.siteId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (!site) throw new Error("Site not found.");

    const created = await createPriceOnConnectedAccount({
      stripeAccountId: connect.stripe_account_id,
      name: data.name,
      amountCents: data.amountCents,
      currency: data.currency,
      interval: data.interval,
    });

    const { data: existing } = await supabaseAdmin
      .from("site_products")
      .select("id")
      .eq("site_id", data.siteId)
      .limit(1)
      .maybeSingle();

    const patch = {
      name: data.name,
      stripe_price_id: created.priceId,
      interval: data.interval === "one_time" ? "one_time" : data.interval,
      amount_cents: data.amountCents,
      currency: data.currency.toLowerCase(),
      active: true,
    };

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("site_products")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("site_products").insert({
        site_id: data.siteId,
        ...patch,
      });
      if (error) throw error;
    }

    return { priceId: created.priceId, productId: created.productId };
  });
